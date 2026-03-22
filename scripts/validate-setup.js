/**
 * SETUP VALIDATION SCRIPT
 * 
 * Validates that all critical components are configured correctly
 * Run this before deploying to production
 * 
 * Usage: node scripts/validate-setup.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let errorCount = 0;
let warningCount = 0;
let successCount = 0;

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
  successCount++;
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  errorCount++;
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  warningCount++;
}

function logSection(message) {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

// ============================================================================
// VALIDATION TESTS
// ============================================================================

async function validateEnvironmentVariables() {
  logSection('1. ENVIRONMENT VARIABLES');
  
  const required = [
    { key: 'VITE_SUPABASE_URL', description: 'Supabase project URL (frontend)' },
    { key: 'VITE_SUPABASE_ANON_KEY', description: 'Supabase anon key (frontend)' },
    { key: 'SUPABASE_URL', description: 'Supabase project URL (backend)' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key (backend)' },
    { key: 'OPENAI_API_KEY', description: 'OpenAI API key' },
    { key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key' },
    { key: 'STRIPE_PUBLIC_KEY', description: 'Stripe public key' },
    { key: 'STRIPE_PRICE_RESPONSE', description: 'Stripe price ID for $19 response' },
    { key: 'SITE_URL', description: 'Site URL' },
    { key: 'ADMIN_KEY', description: 'Admin authentication key' }
  ];
  
  const optional = [
    { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook secret (required for production)' },
    { key: 'SENTRY_DSN', description: 'Sentry error tracking DSN' },
    { key: 'SENDGRID_API_KEY', description: 'SendGrid email API key' }
  ];
  
  // Check required variables
  for (const { key, description } of required) {
    if (process.env[key] && !process.env[key].includes('YOUR-')) {
      logSuccess(`${key} is set (${description})`);
    } else {
      logError(`${key} is missing or not configured (${description})`);
    }
  }
  
  // Check optional variables
  for (const { key, description } of optional) {
    if (process.env[key] && !process.env[key].includes('YOUR-')) {
      logSuccess(`${key} is set (${description})`);
    } else {
      logWarning(`${key} is not set (${description}) - Optional but recommended`);
    }
  }
}

async function validateFileStructure() {
  logSection('2. FILE STRUCTURE');
  
  const criticalFiles = [
    'netlify/functions/analyze-letter.js',
    'netlify/functions/generate-response.js',
    'netlify/functions/create-checkout-session.js',
    'netlify/functions/stripe-webhook.js',
    'netlify/functions/verify-payment.js',
    'netlify/functions/_supabase.js',
    'netlify/functions/_error-tracking.js',
    'netlify/functions/irs-intelligence/index.js',
    'netlify/functions/irs-intelligence/classification-engine.js',
    'netlify/functions/irs-intelligence/risk-guardrails.js',
    'netlify/functions/irs-intelligence/response-playbooks.js',
    'index.html',
    'upload.html',
    'thank-you.html',
    'payment.html',
    'pricing.html',
    'dashboard.html',
    'supabase/migrations/20260224_fix_schema_v2.sql'
  ];
  
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      logSuccess(`${file} exists`);
    } else {
      logError(`${file} is missing`);
    }
  }
}

async function validateDatabaseMigration() {
  logSection('3. DATABASE MIGRATION');
  
  const migrationFile = path.join(process.cwd(), 'supabase/migrations/20260224_fix_schema_v2.sql');
  
  if (fs.existsSync(migrationFile)) {
    logSuccess('Migration file exists');
    
    const content = fs.readFileSync(migrationFile, 'utf8');
    
    // Check for critical components
    if (content.includes('CREATE TABLE public.tlh_letters')) {
      logSuccess('Migration creates tlh_letters table');
    } else {
      logError('Migration does not create tlh_letters table');
    }
    
    if (content.includes('ENABLE ROW LEVEL SECURITY')) {
      logSuccess('Migration enables RLS');
    } else {
      logWarning('Migration does not enable RLS');
    }
    
    if (content.includes('CREATE INDEX')) {
      logSuccess('Migration creates indexes');
    } else {
      logWarning('Migration does not create indexes');
    }
    
    console.log(`\n${colors.yellow}NOTE: Migration file exists but must be manually applied in Supabase SQL Editor${colors.reset}`);
    console.log(`${colors.yellow}Go to: https://app.supabase.com/project/YOUR-PROJECT/sql${colors.reset}\n`);
  } else {
    logError('Migration file not found');
  }
}

async function validateSupabaseConnection() {
  logSection('4. SUPABASE CONNECTION');
  
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('YOUR-')) {
    logError('Supabase URL not configured - skipping connection test');
    return;
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('YOUR-')) {
    logError('Supabase service role key not configured - skipping connection test');
    return;
  }
  
  try {
    const { getSupabaseAdmin } = require('../netlify/functions/_supabase.js');
    const supabase = getSupabaseAdmin();
    
    // Test connection by querying system table
    const { data, error } = await supabase
      .from('tlh_letters')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        logError('tlh_letters table does not exist - run migration first');
      } else {
        logError(`Supabase connection failed: ${error.message}`);
      }
    } else {
      logSuccess('Supabase connection successful');
      logSuccess('tlh_letters table exists and is accessible');
    }
  } catch (error) {
    logError(`Supabase connection test failed: ${error.message}`);
  }
}

async function validateStripeConfiguration() {
  logSection('5. STRIPE CONFIGURATION');
  
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('YOUR-')) {
    logError('Stripe secret key not configured - skipping Stripe tests');
    return;
  }
  
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Test API connection
    const account = await stripe.account.retrieve();
    logSuccess(`Stripe connected: ${account.business_profile?.name || account.id}`);
    
    // Check if using test mode
    if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      logWarning('Using Stripe TEST mode - remember to switch to live keys for production');
    } else if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
      logSuccess('Using Stripe LIVE mode');
    }
    
    // Verify price exists
    if (process.env.STRIPE_PRICE_RESPONSE && !process.env.STRIPE_PRICE_RESPONSE.includes('YOUR-')) {
      try {
        const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_RESPONSE);
        logSuccess(`Price configured: $${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
      } catch (error) {
        logError(`Price ID invalid: ${error.message}`);
      }
    } else {
      logError('STRIPE_PRICE_RESPONSE not configured');
    }
    
  } catch (error) {
    logError(`Stripe validation failed: ${error.message}`);
  }
}

async function validateOpenAI() {
  logSection('6. OPENAI CONFIGURATION');
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('YOUR-')) {
    logError('OpenAI API key not configured - skipping OpenAI tests');
    return;
  }
  
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Test API connection with minimal request
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    
    logSuccess('OpenAI API connection successful');
    logSuccess(`Model: ${response.model}`);
  } catch (error) {
    logError(`OpenAI validation failed: ${error.message}`);
  }
}

async function validateIntelligenceSystem() {
  logSection('7. IRS INTELLIGENCE SYSTEM');
  
  try {
    const { classifyIRSNotice } = require('../netlify/functions/irs-intelligence/classification-engine.js');
    const { analyzeRisks } = require('../netlify/functions/irs-intelligence/risk-guardrails.js');
    const { getPlaybook } = require('../netlify/functions/irs-intelligence/response-playbooks.js');
    
    // Test classification
    const testNotice = 'CP2000 PROPOSED CHANGES TO YOUR TAX RETURN';
    const classification = classifyIRSNotice(testNotice);
    
    if (classification.noticeType === 'CP2000') {
      logSuccess('Classification engine working correctly');
    } else {
      logError('Classification engine failed test');
    }
    
    // Test risk analysis
    const testText = 'I forgot to report this income';
    const risks = analyzeRisks(testText, classification);
    
    if (risks.admissionsOfFault.length > 0) {
      logSuccess('Risk guardrails detecting dangerous language');
    } else {
      logError('Risk guardrails not detecting dangerous language');
    }
    
    // Test playbook retrieval
    const playbook = getPlaybook('CP2000');
    
    if (playbook && playbook.noticeType === 'CP2000') {
      logSuccess('Playbook system working correctly');
    } else {
      logError('Playbook system failed test');
    }
    
  } catch (error) {
    logError(`Intelligence system validation failed: ${error.message}`);
  }
}

async function validateSecurityHeaders() {
  logSection('8. SECURITY CONFIGURATION');
  
  // Check for security-related files
  const securityFile = path.join(process.cwd(), 'netlify/functions/security-headers.js');
  if (fs.existsSync(securityFile)) {
    logSuccess('Security headers function exists');
  } else {
    logWarning('Security headers function not found');
  }
  
  // Check admin key strength
  if (process.env.ADMIN_KEY && process.env.ADMIN_KEY.length >= 32 && !process.env.ADMIN_KEY.includes('CHANGE-THIS')) {
    logSuccess('Admin key is configured and appears strong');
  } else {
    logError('Admin key is weak or not configured - generate a strong random key');
  }
  
  // Check for .env in .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignore.includes('.env')) {
      logSuccess('.env is in .gitignore');
    } else {
      logError('.env is NOT in .gitignore - add it immediately!');
    }
  } else {
    logWarning('.gitignore file not found');
  }
}

async function validateDependencies() {
  logSection('9. DEPENDENCIES');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const functionsPackageJsonPath = path.join(process.cwd(), 'netlify/functions/package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    logSuccess('Root package.json exists');
    
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    // Check critical dependencies
    const criticalDeps = ['openai', 'stripe', '@supabase/supabase-js'];
    for (const dep of criticalDeps) {
      if (allDeps[dep]) {
        logSuccess(`${dep} is installed`);
      } else {
        logError(`${dep} is NOT installed - run: npm install ${dep}`);
      }
    }
  } else {
    logError('package.json not found');
  }
  
  if (fs.existsSync(functionsPackageJsonPath)) {
    logSuccess('Functions package.json exists');
  } else {
    logWarning('Functions package.json not found - may cause deployment issues');
  }
}

async function validateHTMLPages() {
  logSection('10. HTML PAGES');
  
  const pages = [
    'index.html',
    'upload.html',
    'payment.html',
    'thank-you.html',
    'pricing.html',
    'dashboard.html',
    'terms.html',
    'privacy.html',
    'disclaimer.html'
  ];
  
  for (const page of pages) {
    const pagePath = path.join(process.cwd(), page);
    if (fs.existsSync(pagePath)) {
      logSuccess(`${page} exists`);
    } else {
      logError(`${page} is missing`);
    }
  }
}

async function generateReport() {
  logSection('VALIDATION SUMMARY');
  
  console.log(`${colors.green}Passed: ${successCount}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${warningCount}${colors.reset}`);
  console.log(`${colors.red}Errors: ${errorCount}${colors.reset}\n`);
  
  if (errorCount === 0 && warningCount === 0) {
    console.log(`${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ ALL VALIDATION TESTS PASSED${colors.reset}`);
    console.log(`${colors.green}✓ System is ready for deployment${colors.reset}`);
    console.log(`${colors.green}═══════════════════════════════════════════════════════${colors.reset}\n`);
    return 0;
  } else if (errorCount === 0) {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}⚠ VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}⚠ Review warnings before deployment${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}\n`);
    return 0;
  } else {
    console.log(`${colors.red}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.red}✗ VALIDATION FAILED${colors.reset}`);
    console.log(`${colors.red}✗ Fix ${errorCount} error(s) before deployment${colors.reset}`);
    console.log(`${colors.red}═══════════════════════════════════════════════════════${colors.reset}\n`);
    return 1;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(`\n${colors.blue}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Tax Letter Defense Pro - SETUP VALIDATION SCRIPT            ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  await validateEnvironmentVariables();
  await validateFileStructure();
  await validateDatabaseMigration();
  await validateSupabaseConnection();
  await validateStripeConfiguration();
  await validateOpenAI();
  await validateIntelligenceSystem();
  await validateSecurityHeaders();
  await validateDependencies();
  await validateHTMLPages();
  
  const exitCode = await generateReport();
  process.exit(exitCode);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
