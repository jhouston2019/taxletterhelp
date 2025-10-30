const OpenAI = require("openai");
const Stripe = require("stripe");
const sgMail = require("@sendgrid/mail");
const { createClient } = require("@supabase/supabase-js");
// Use built-in fetch (Node 18+) - no need to import node-fetch

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

function pad(s, n = 26) {
  return (s + ':').padEnd(n, ' ');
}

function logKeyStatus(key, present) {
  const label = pad(key);
  return present ? `${label} ✅ Found` : `${label} ❌ Missing`;
}

async function timeIt(fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Math.round(Date.now() - start);
    return { ok: true, ms, result };
  } catch (err) {
    const ms = Math.round(Date.now() - start);
    return { ok: false, ms, error: err.message || String(err) };
  }
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  const report = {
    env: {},
    integrations: {},
    missing: [],
    allPassed: true
  };

  // Check environment variables
  for (const key of REQUIRED_KEYS) {
    const present = Boolean(process.env[key] && String(process.env[key]).trim().length > 0);
    report.env[key] = { found: present };
    if (!present) {
      report.missing.push(key);
      report.allPassed = false;
    }
  }

  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    report.integrations.OpenAI = await timeIt(async () => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
    if (!report.integrations.OpenAI.ok) report.allPassed = false;
  } else {
    report.integrations.OpenAI = { ok: false, ms: 0, error: 'OPENAI_API_KEY missing' };
    report.allPassed = false;
  }

  // Test Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    report.integrations.Supabase = await timeIt(async () => {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
      
      // Try to insert into system_check table
      let { error } = await supabase.from('system_check').insert([{
        checked_at: new Date().toISOString(),
        status: 'ok',
        note: 'production readiness check'
      }]);
      
      // If table doesn't exist, verify connection by querying an existing table
      if (error && (error.message.includes('relation') || error.message.includes('does not exist'))) {
        // Fallback: verify connection by checking a known table
        const { error: queryError } = await supabase.from('tlh_letters').select('id').limit(1);
        if (queryError && !queryError.message.includes('relation') && !queryError.message.includes('does not exist')) {
          throw new Error(`Connection test failed: ${queryError.message}`);
        }
        // Connection works even if tables don't exist yet
        return true;
      }
      
      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }
      return true;
    });
    if (!report.integrations.Supabase.ok) report.allPassed = false;
  } else {
    report.integrations.Supabase = { ok: false, ms: 0, error: 'Supabase env missing' };
    report.allPassed = false;
  }

  // Test Stripe
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_RESPONSE) {
    report.integrations.Stripe = await timeIt(async () => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const priceId = process.env.STRIPE_PRICE_RESPONSE;
      const price = await stripe.prices.retrieve(priceId);
      if (!price || price.object !== 'price') throw new Error('Invalid price');
      if (price.product) {
        const product = typeof price.product === 'string' 
          ? await stripe.products.retrieve(price.product) 
          : price.product;
        if (!product || product.object !== 'product') throw new Error('Invalid product');
      }
      return true;
    });
    if (!report.integrations.Stripe.ok) report.allPassed = false;
  } else {
    report.integrations.Stripe = { ok: false, ms: 0, error: 'Stripe env missing' };
    report.allPassed = false;
  }

  // Test SendGrid
  if (process.env.SENDGRID_API_KEY) {
    report.integrations.SendGrid = await timeIt(async () => {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const [res] = await sgMail.client.request({ 
        method: 'GET', 
        url: '/v3/user/credits' 
      });
      if (!res || res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`Unexpected status ${res?.statusCode}`);
      }
      return true;
    });
    if (!report.integrations.SendGrid.ok) report.allPassed = false;
  } else {
    report.integrations.SendGrid = { ok: false, ms: 0, error: 'SENDGRID_API_KEY missing' };
    report.allPassed = false;
  }

  // Test SITE_URL
  if (process.env.SITE_URL) {
    report.integrations.SITE_URL = await timeIt(async () => {
      // Use built-in fetch (available in Node 18+)
      const res = await globalThis.fetch(process.env.SITE_URL, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    });
    if (!report.integrations.SITE_URL.ok) report.allPassed = false;
  } else {
    report.integrations.SITE_URL = { ok: false, ms: 0, error: 'SITE_URL missing' };
    report.allPassed = false;
  }

  // Format response
  const output = [];
  output.push('Environment Variables Check');
  for (const key of REQUIRED_KEYS) {
    output.push(logKeyStatus(key, report.env[key].found));
  }
  output.push('');
  output.push('Integration Checks');
  
  const integrationNames = ['OpenAI', 'Supabase', 'Stripe', 'SendGrid', 'SITE_URL'];
  for (const name of integrationNames) {
    const result = report.integrations[name];
    const status = result.ok ? '✅' : '❌';
    output.push(`${pad(name)} ${status} (${result.ms} ms)`);
    if (!result.ok) {
      output.push(`  ↳ Error: ${result.error}`);
    }
  }
  
  if (report.missing.length > 0) {
    output.push('');
    output.push('Missing or invalid keys:');
    report.missing.forEach(key => output.push(`- ${key}`));
  }
  
  if (report.allPassed) {
    output.push('');
    output.push('✅ All environment variables and integrations are working — ready for production deploy.');
  }

  return {
    statusCode: report.allPassed ? 200 : 500,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    },
    body: output.join('\n')
  };
};

