#!/usr/bin/env node

/**
 * SCHEMA VALIDATION SCRIPT - Day 1 Non-Negotiable
 * 
 * This script validates that all required database tables exist
 * and that the application can interact with them correctly.
 * 
 * Run this AFTER applying the migration:
 * node scripts/validate-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logError('Missing environment variables:');
  if (!supabaseUrl) logError('  - SUPABASE_URL or VITE_SUPABASE_URL');
  if (!supabaseKey) logError('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Required tables from code analysis
const REQUIRED_TABLES = [
  'users',
  'documents',
  'subscriptions',
  'usage_tracking',
  'tlh_letters',  // CRITICAL - most referenced table
  'system_check'
];

// Required columns for tlh_letters (from code usage)
const REQUIRED_TLH_LETTERS_COLUMNS = {
  id: 'uuid',
  user_email: 'text',
  stripe_session_id: 'text',
  price_id: 'text',
  letter_text: 'text',
  analysis: 'jsonb',
  summary: 'text',
  ai_response: 'text',
  status: 'text',
  risk_level: 'text',
  requires_professional_review: 'boolean',
  created_at: 'timestamp with time zone'
};

async function validateSchema() {
  log('\n===========================================', 'blue');
  log('  DATABASE SCHEMA VALIDATION - Day 1', 'blue');
  log('===========================================\n', 'blue');

  let allTestsPassed = true;

  // Test 1: Check all required tables exist
  logInfo('Test 1: Checking required tables...');
  for (const tableName of REQUIRED_TABLES) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      if (error) {
        logError(`Table '${tableName}' does not exist or is not accessible`);
        logError(`  Error: ${error.message}`);
        allTestsPassed = false;
      } else {
        logSuccess(`Table '${tableName}' exists and is accessible`);
      }
    } catch (err) {
      logError(`Failed to check table '${tableName}': ${err.message}`);
      allTestsPassed = false;
    }
  }

  // Test 2: Validate tlh_letters table structure
  logInfo('\nTest 2: Validating tlh_letters table structure...');
  try {
    // Try to insert a test record
    const testRecord = {
      user_email: 'test@validation.com',
      stripe_session_id: `test_${Date.now()}`,
      letter_text: 'Test letter for validation',
      status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('tlh_letters')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      logError('Failed to insert test record into tlh_letters');
      logError(`  Error: ${insertError.message}`);
      allTestsPassed = false;
    } else {
      logSuccess('Successfully inserted test record');

      // Verify all required columns exist
      const missingColumns = Object.keys(REQUIRED_TLH_LETTERS_COLUMNS)
        .filter(col => !(col in insertData));

      if (missingColumns.length > 0) {
        logError(`Missing required columns: ${missingColumns.join(', ')}`);
        allTestsPassed = false;
      } else {
        logSuccess('All required columns present');
      }

      // Clean up test record
      const { error: deleteError } = await supabase
        .from('tlh_letters')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        logWarning(`Could not delete test record: ${deleteError.message}`);
      } else {
        logSuccess('Test record cleaned up');
      }
    }
  } catch (err) {
    logError(`tlh_letters validation failed: ${err.message}`);
    allTestsPassed = false;
  }

  // Test 3: Verify payment flow fields
  logInfo('\nTest 3: Verifying payment flow fields...');
  try {
    const testPayment = {
      user_email: 'payment-test@validation.com',
      stripe_session_id: `cs_test_${Date.now()}`,
      price_id: 'price_test_123',
      letter_text: 'Payment test letter',
      status: 'paid'
    };

    const { data, error } = await supabase
      .from('tlh_letters')
      .insert(testPayment)
      .select()
      .single();

    if (error) {
      logError('Payment flow fields validation failed');
      logError(`  Error: ${error.message}`);
      allTestsPassed = false;
    } else {
      logSuccess('Payment flow fields validated');

      // Verify we can query by stripe_session_id (critical for webhook)
      const { data: queryData, error: queryError } = await supabase
        .from('tlh_letters')
        .select('*')
        .eq('stripe_session_id', testPayment.stripe_session_id)
        .single();

      if (queryError) {
        logError('Cannot query by stripe_session_id');
        logError(`  Error: ${queryError.message}`);
        allTestsPassed = false;
      } else {
        logSuccess('stripe_session_id query works (critical for webhooks)');
      }

      // Clean up
      await supabase.from('tlh_letters').delete().eq('id', data.id);
    }
  } catch (err) {
    logError(`Payment flow validation failed: ${err.message}`);
    allTestsPassed = false;
  }

  // Test 4: Verify analysis flow fields
  logInfo('\nTest 4: Verifying analysis flow fields...');
  try {
    const testAnalysis = {
      user_email: 'analysis-test@validation.com',
      letter_text: 'Analysis test letter',
      analysis: {
        letterType: 'CP2000',
        urgency: 'high',
        confidence: 85
      },
      summary: 'Test summary',
      status: 'analyzed'
    };

    const { data, error } = await supabase
      .from('tlh_letters')
      .insert(testAnalysis)
      .select()
      .single();

    if (error) {
      logError('Analysis flow fields validation failed');
      logError(`  Error: ${error.message}`);
      allTestsPassed = false;
    } else {
      logSuccess('Analysis flow fields validated');
      logSuccess('JSONB analysis field works');

      // Update with AI response (simulating response generation)
      const { error: updateError } = await supabase
        .from('tlh_letters')
        .update({
          ai_response: 'Test AI response letter',
          status: 'responded',
          risk_level: 'low',
          requires_professional_review: false
        })
        .eq('id', data.id);

      if (updateError) {
        logError('Cannot update with AI response');
        logError(`  Error: ${updateError.message}`);
        allTestsPassed = false;
      } else {
        logSuccess('AI response update works');
      }

      // Clean up
      await supabase.from('tlh_letters').delete().eq('id', data.id);
    }
  } catch (err) {
    logError(`Analysis flow validation failed: ${err.message}`);
    allTestsPassed = false;
  }

  // Test 5: Verify indexes exist (performance check)
  logInfo('\nTest 5: Checking critical indexes...');
  try {
    // Query with indexed fields should be fast
    const start = Date.now();
    const { error } = await supabase
      .from('tlh_letters')
      .select('id')
      .eq('user_email', 'nonexistent@test.com')
      .limit(1);

    const duration = Date.now() - start;

    if (error) {
      logWarning(`Index check query failed: ${error.message}`);
    } else if (duration > 1000) {
      logWarning(`Query took ${duration}ms - indexes may not be optimal`);
    } else {
      logSuccess(`Query performance good (${duration}ms)`);
    }
  } catch (err) {
    logWarning(`Index check failed: ${err.message}`);
  }

  // Final summary
  log('\n===========================================', 'blue');
  if (allTestsPassed) {
    logSuccess('ALL VALIDATION TESTS PASSED ✓');
    log('===========================================\n', 'green');
    log('Database schema is ready for production use.', 'green');
    log('You can proceed to Day 2: Payment Flow.\n', 'green');
    return 0;
  } else {
    logError('SOME VALIDATION TESTS FAILED ✗');
    log('===========================================\n', 'red');
    log('Fix the issues above before proceeding.', 'red');
    log('Re-run this script after fixes.\n', 'red');
    return 1;
  }
}

// Run validation
validateSchema()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    logError(`Validation script crashed: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
