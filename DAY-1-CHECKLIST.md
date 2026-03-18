# DAY 1: DATABASE SCHEMA FIX - Non-Negotiable Checklist

**Status:** 🔴 CRITICAL - Nothing else matters until this is complete  
**Estimated Time:** 2-4 hours  
**Owner:** Backend Developer

---

## ⚠️ WHY THIS IS NON-NEGOTIABLE

Your code references `tlh_letters` table **12 times** across 8 different functions:
- `analyze-letter.js` (stores analysis results)
- `generate-response.js` (stores AI responses)
- `stripe-webhook.js` (updates payment status)
- `export-pdf.js` (retrieves responses for download)
- `send-email.js` (retrieves responses for email)
- `admin.js` (admin dashboard queries)
- `prod-check.js` (system health checks)

**Without this table, your entire application will crash on first use.**

---

## 📋 STEP-BY-STEP EXECUTION

### Step 1: Backup Current Database (5 minutes)

**Why:** Safety first - always backup before schema changes.

**Action:**
1. Open Supabase Dashboard: https://app.supabase.com
2. Navigate to your project
3. Go to Database → Backups
4. Click "Create Backup" (if available)
5. Or export current schema:
   ```sql
   -- Run this in SQL Editor and save output
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

**Verification:**
- [ ] Backup created or schema exported
- [ ] Backup timestamp noted: _______________

---

### Step 2: Apply Migration (10 minutes)

**Action:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open the migration file: `supabase/migrations/20260224_fix_schema.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click "Run"
7. Wait for completion (should see success messages)

**Expected Output:**
```
NOTICE: All required tables exist ✓
NOTICE: ✓ Schema fix migration completed successfully
NOTICE: ✓ tlh_letters table created with all required fields
NOTICE: ✓ Indexes created for performance
NOTICE: ✓ RLS policies configured
NOTICE: ✓ Ready for application use
```

**Verification:**
- [ ] Migration ran without errors
- [ ] Success notices displayed
- [ ] No red error messages

**If Errors Occur:**
- Copy full error message
- Check if table already exists: `SELECT * FROM tlh_letters LIMIT 1;`
- If table exists but migration fails, may need to drop and recreate
- Contact support if stuck

---

### Step 3: Verify Tables Exist (5 minutes)

**Action:**
Run these queries in SQL Editor:

```sql
-- Check all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users',
    'documents', 
    'subscriptions',
    'usage_tracking',
    'tlh_letters',
    'system_check'
  )
ORDER BY table_name;
```

**Expected Output:**
Should return 6 rows with all table names.

**Verification:**
- [ ] All 6 tables returned
- [ ] `tlh_letters` is in the list (CRITICAL)

---

### Step 4: Verify tlh_letters Structure (10 minutes)

**Action:**
```sql
-- Check tlh_letters columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tlh_letters'
ORDER BY ordinal_position;
```

**Required Columns (must all be present):**
- [ ] `id` (uuid)
- [ ] `user_email` (text)
- [ ] `stripe_session_id` (text)
- [ ] `price_id` (text)
- [ ] `letter_text` (text)
- [ ] `analysis` (jsonb)
- [ ] `summary` (text)
- [ ] `ai_response` (text)
- [ ] `status` (text)
- [ ] `risk_level` (text)
- [ ] `requires_professional_review` (boolean)
- [ ] `created_at` (timestamp with time zone)
- [ ] `updated_at` (timestamp with time zone)

**If Any Missing:**
Re-run migration or manually add missing columns.

---

### Step 5: Test Insert/Update/Select (15 minutes)

**Action:**
Run this test sequence in SQL Editor:

```sql
-- Test 1: Insert test record
INSERT INTO tlh_letters (
  user_email,
  stripe_session_id,
  letter_text,
  status
) VALUES (
  'test@validation.com',
  'cs_test_' || floor(random() * 1000000),
  'Test letter for Day 1 validation',
  'pending'
) RETURNING id, created_at;

-- Save the returned ID for next steps
-- Replace 'YOUR_ID_HERE' with actual ID from above

-- Test 2: Update with analysis
UPDATE tlh_letters 
SET 
  analysis = '{"letterType": "CP2000", "urgency": "high"}'::jsonb,
  summary = 'Test summary',
  status = 'analyzed'
WHERE id = 'YOUR_ID_HERE'
RETURNING *;

-- Test 3: Update with AI response
UPDATE tlh_letters
SET
  ai_response = 'Test AI response letter',
  status = 'responded',
  risk_level = 'low',
  requires_professional_review = false
WHERE id = 'YOUR_ID_HERE'
RETURNING *;

-- Test 4: Query by stripe_session_id (CRITICAL for webhooks)
SELECT * FROM tlh_letters 
WHERE stripe_session_id LIKE 'cs_test_%'
LIMIT 1;

-- Test 5: Clean up test data
DELETE FROM tlh_letters 
WHERE user_email = 'test@validation.com';
```

**Verification:**
- [ ] Insert succeeded
- [ ] Update with analysis succeeded
- [ ] Update with AI response succeeded
- [ ] Query by stripe_session_id returned record
- [ ] Delete succeeded

---

### Step 6: Run Automated Validation Script (10 minutes)

**Action:**
```bash
# Make script executable (Unix/Mac)
chmod +x scripts/validate-schema.js

# Run validation
node scripts/validate-schema.js
```

**Expected Output:**
```
===========================================
  DATABASE SCHEMA VALIDATION - Day 1
===========================================

ℹ Test 1: Checking required tables...
✓ Table 'users' exists and is accessible
✓ Table 'documents' exists and is accessible
✓ Table 'subscriptions' exists and is accessible
✓ Table 'usage_tracking' exists and is accessible
✓ Table 'tlh_letters' exists and is accessible
✓ Table 'system_check' exists and is accessible

ℹ Test 2: Validating tlh_letters table structure...
✓ Successfully inserted test record
✓ All required columns present
✓ Test record cleaned up

ℹ Test 3: Verifying payment flow fields...
✓ Payment flow fields validated
✓ stripe_session_id query works (critical for webhooks)

ℹ Test 4: Verifying analysis flow fields...
✓ Analysis flow fields validated
✓ JSONB analysis field works
✓ AI response update works

ℹ Test 5: Checking critical indexes...
✓ Query performance good (XXms)

===========================================
✓ ALL VALIDATION TESTS PASSED ✓
===========================================
Database schema is ready for production use.
You can proceed to Day 2: Payment Flow.
```

**Verification:**
- [ ] All tests passed (green checkmarks)
- [ ] No red error messages
- [ ] Script says "ready for production use"

**If Tests Fail:**
1. Read error messages carefully
2. Fix issues in Supabase
3. Re-run validation script
4. Repeat until all tests pass

---

### Step 7: Test Full Letter Flow Locally (30 minutes)

**Prerequisites:**
- Local environment variables set (`.env` file)
- Netlify CLI installed: `npm install -g netlify-cli`

**Action:**
```bash
# Start local dev server
netlify dev

# In browser, navigate to:
# http://localhost:8888/upload.html

# Test sequence:
# 1. Upload a test PDF or image
# 2. Wait for analysis to complete
# 3. Check browser console for errors
# 4. Verify analysis displays
# 5. Generate response
# 6. Check console again
# 7. Verify response displays
```

**Verification:**
- [ ] Upload works without database errors
- [ ] Analysis completes and displays
- [ ] Response generates without errors
- [ ] No "table does not exist" errors in console
- [ ] Check Supabase dashboard - record should exist in tlh_letters

**Check Database:**
```sql
-- Verify record was created
SELECT 
  id,
  user_email,
  status,
  created_at,
  letter_text IS NOT NULL as has_letter,
  analysis IS NOT NULL as has_analysis,
  ai_response IS NOT NULL as has_response
FROM tlh_letters
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
Should see your test record with:
- `has_letter`: true
- `has_analysis`: true (if analysis completed)
- `has_response`: true (if response generated)

---

### Step 8: Test Payment State Persistence (15 minutes)

**Action:**
```sql
-- Simulate webhook payment confirmation
INSERT INTO tlh_letters (
  user_email,
  stripe_session_id,
  stripe_customer_id,
  price_id,
  letter_text,
  status
) VALUES (
  'paid-test@validation.com',
  'cs_test_payment_123',
  'cus_test_123',
  'price_1234567890',
  'Paid test letter',
  'paid'
) RETURNING id;

-- Verify we can query by stripe_session_id (webhook lookup)
SELECT id, status, user_email, created_at
FROM tlh_letters
WHERE stripe_session_id = 'cs_test_payment_123';

-- Simulate analysis after payment
UPDATE tlh_letters
SET 
  analysis = '{"letterType": "CP2000", "urgency": "high"}'::jsonb,
  status = 'analyzed'
WHERE stripe_session_id = 'cs_test_payment_123'
RETURNING *;

-- Clean up
DELETE FROM tlh_letters WHERE stripe_session_id = 'cs_test_payment_123';
```

**Verification:**
- [ ] Insert with payment data succeeded
- [ ] Query by stripe_session_id found record
- [ ] Update after payment succeeded
- [ ] This flow will work for real webhooks

---

### Step 9: Verify History Retrieval (10 minutes)

**Action:**
```sql
-- Test user history query (used in dashboard)
SELECT 
  id,
  letter_text,
  status,
  risk_level,
  created_at,
  analysis->>'letterType' as notice_type
FROM tlh_letters
WHERE user_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 10;

-- Test admin query (used in admin.js)
SELECT 
  COUNT(*) as total_letters,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_letters,
  COUNT(*) FILTER (WHERE status = 'analyzed') as analyzed_letters,
  COUNT(*) FILTER (WHERE status = 'responded') as responded_letters,
  COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_letters
FROM tlh_letters;
```

**Verification:**
- [ ] User history query works (even if empty)
- [ ] Admin stats query works
- [ ] No errors returned

---

## ✅ FINAL DAY 1 CHECKLIST

Before moving to Day 2, confirm ALL of these:

### Database
- [ ] Migration applied successfully
- [ ] tlh_letters table exists
- [ ] All 13 required columns present
- [ ] Indexes created (8 indexes)
- [ ] RLS policies enabled (4 policies)
- [ ] Trigger for updated_at works

### Testing
- [ ] Automated validation script passed all tests
- [ ] Manual insert/update/select tests passed
- [ ] Full letter flow works locally
- [ ] Payment state persistence tested
- [ ] History retrieval queries work

### Code Verification
- [ ] No "table does not exist" errors in console
- [ ] analyze-letter.js can insert records
- [ ] generate-response.js can update records
- [ ] stripe-webhook.js can query by stripe_session_id
- [ ] export-pdf.js can retrieve ai_response

### Documentation
- [ ] Migration file saved in repo
- [ ] Validation script saved in repo
- [ ] This checklist completed
- [ ] Any issues documented

---

## 🚫 DO NOT PROCEED TO DAY 2 UNTIL:

1. ✅ Validation script shows: "ALL VALIDATION TESTS PASSED"
2. ✅ Full letter flow works locally without database errors
3. ✅ You can see test records in Supabase dashboard
4. ✅ All checkboxes above are marked

---

## 🆘 TROUBLESHOOTING

### Error: "relation 'tlh_letters' does not exist"
**Solution:** Migration didn't run. Re-run migration in SQL Editor.

### Error: "column 'X' does not exist"
**Solution:** Migration partially ran. Drop table and re-run:
```sql
DROP TABLE IF EXISTS tlh_letters CASCADE;
-- Then re-run migration
```

### Error: "permission denied for table tlh_letters"
**Solution:** RLS policies too restrictive. Check policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'tlh_letters';
```

### Validation script fails
**Solution:** 
1. Check environment variables are set
2. Verify SUPABASE_SERVICE_ROLE_KEY is correct (not anon key)
3. Check Supabase project is accessible

### Can't insert records
**Solution:**
1. Check RLS policies allow inserts
2. Verify service_role key is being used
3. Check required NOT NULL fields are provided

---

## 📊 SUCCESS CRITERIA

You know Day 1 is complete when:

1. ✅ Validation script exits with code 0 (success)
2. ✅ You can upload a letter locally and see it in database
3. ✅ Analysis stores correctly in tlh_letters table
4. ✅ Response generation updates the same record
5. ✅ No database errors in browser console
6. ✅ Supabase dashboard shows test records

---

## ⏭️ NEXT STEP

Once ALL checkboxes are marked and validation passes:

**Proceed to:** `DAY-2-PAYMENT-FLOW.md`

**DO NOT skip Day 1 validation.** Payment flow (Day 2) depends on this database schema working correctly.

---

**Day 1 Completed:** _______________  
**Completed By:** _______________  
**Validation Status:** ⬜ PASS / ⬜ FAIL  
**Ready for Day 2:** ⬜ YES / ⬜ NO

---

*This checklist must be completed before any other launch preparation work.*
