#!/usr/bin/env node
import OpenAI from 'openai';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const REQUIRED_KEYS = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_RESPONSE',
  'STRIPE_WEBHOOK_SECRET',
  'SENDGRID_API_KEY',
  'SITE_URL',
  'ENVIRONMENT',
];

const pad = (s, n = 26) => (s + ':').padEnd(n, ' ');

function logKeyStatus(key, present) {
  const label = pad(key);
  if (present) {
    console.log(`${label} ✅ Found`);
  } else {
    console.log(`${label} ❌ Missing`);
  }
}

async function timeIt(name, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - start);
    return { ok: true, ms, result };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    return { ok: false, ms, error: err };
  }
}

function summarize(name, outcome) {
  const status = outcome.ok ? '✅' : '❌';
  console.log(`${pad(name)} ${status} (${outcome.ms} ms)`);
  if (!outcome.ok) {
    const msg = outcome.error?.message || String(outcome.error);
    console.log(`  ↳ Error: ${msg}`);
  }
}

async function checkEnv() {
  console.log('Environment Variables Check');
  const missing = [];
  for (const key of REQUIRED_KEYS) {
    const present = Boolean(process.env[key] && String(process.env[key]).trim().length > 0);
    logKeyStatus(key, present);
    if (!present) missing.push(key);
  }
  console.log('');
  return missing;
}

async function checkOpenAI() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return timeIt('OpenAI', async () => {
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Generate a single short sentence.' }],
      max_tokens: 20,
      temperature: 0.2,
    });
    const text = resp?.choices?.[0]?.message?.content || '';
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid OpenAI response');
    }
    return true;
  });
}

async function checkSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  return timeIt('Supabase', async () => {
    const payload = {
      checked_at: new Date().toISOString(),
      status: 'ok',
      note: 'production readiness check',
    };
    const { error } = await supabase.from('system_check').insert([payload]);
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
    return true;
  });
}

async function checkStripe() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return timeIt('Stripe', async () => {
    const priceId = process.env.STRIPE_PRICE_RESPONSE;
    const price = await stripe.prices.retrieve(priceId);
    if (!price || price.object !== 'price') throw new Error('Invalid price');
    if (price.product) {
      const product = typeof price.product === 'string' ? await stripe.products.retrieve(price.product) : price.product;
      if (!product || product.object !== 'product') throw new Error('Invalid product');
    }
    return true;
  });
}

async function checkSendGrid() {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  return timeIt('SendGrid', async () => {
    // Use an authenticated GET that does not send an email
    const [res] = await sgMail.client.request({ method: 'GET', url: '/v3/user/credits' });
    if (!res || res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`Unexpected status ${res?.statusCode}`);
    }
    return true;
  });
}

async function checkSiteUrl() {
  return timeIt('SITE_URL', async () => {
    const url = process.env.SITE_URL;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  });
}

async function main() {
  const missing = await checkEnv();

  const results = [];
  if (!missing.includes('OPENAI_API_KEY')) results.push(await checkOpenAI());
  else results.push({ ok: false, ms: 0, error: new Error('OPENAI_API_KEY missing') });

  if (!missing.includes('SUPABASE_URL') && !missing.includes('SUPABASE_SERVICE_ROLE_KEY')) results.push(await checkSupabase());
  else results.push({ ok: false, ms: 0, error: new Error('Supabase env missing') });

  if (!missing.includes('STRIPE_SECRET_KEY') && !missing.includes('STRIPE_PRICE_RESPONSE')) results.push(await checkStripe());
  else results.push({ ok: false, ms: 0, error: new Error('Stripe env missing') });

  if (!missing.includes('SENDGRID_API_KEY')) results.push(await checkSendGrid());
  else results.push({ ok: false, ms: 0, error: new Error('SENDGRID_API_KEY missing') });

  if (!missing.includes('SITE_URL')) results.push(await checkSiteUrl());
  else results.push({ ok: false, ms: 0, error: new Error('SITE_URL missing') });

  console.log('Integration Checks');
  const names = ['OpenAI', 'Supabase', 'Stripe', 'SendGrid', 'SITE_URL'];
  for (let i = 0; i < names.length; i++) summarize(names[i], results[i]);

  const allOk = missing.length === 0 && results.every(r => r.ok);
  if (!allOk) {
    if (missing.length) {
      console.log('');
      console.log('Missing or invalid keys:');
      for (const m of missing) console.log(`- ${m}`);
    }
    process.exitCode = 1;
  } else {
    console.log('');
    console.log('✅ All environment variables and integrations are working — ready for production deploy.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});


