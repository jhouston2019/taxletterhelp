# Quick Start Guide - Critical Fixes

**Use this guide to implement Days 1-2 in the correct order.**

---

## 🚀 DAY 1: DATABASE SCHEMA (2 hours)

### Step 1: Apply Migration (10 min)
```
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open: supabase/migrations/20260224_fix_schema.sql
4. Copy all contents
5. Paste into SQL Editor
6. Click "Run"
7. Wait for success messages
```

### Step 2: Validate (5 min)
```bash
node scripts/validate-schema.js
```
**Expected:** "ALL VALIDATION TESTS PASSED ✓"

### Step 3: Test Locally (15 min)
```bash
netlify dev
# Go to http://localhost:8888/upload.html
# Upload a test file
# Verify no database errors
```

**✅ Day 1 Complete When:**
- Validation script passes
- Can upload files locally
- No "table does not exist" errors

---

## 🚀 DAY 2: PAYMENT FLOW (4 hours)

### Step 1: Deploy Code (10 min)
```bash
git add netlify/functions/stripe-webhook.js
git add netlify/functions/verify-payment.js
git add netlify/functions/create-checkout-session.js
git add thank-you.html
git commit -m "Day 2: Fix payment flow"
git push origin main
```

### Step 2: Configure Stripe Webhook (15 min)
```
1. Go to https://dashboard.stripe.com
2. Developers → Webhooks
3. Add endpoint: https://YOUR-DOMAIN/.netlify/functions/stripe-webhook
4. Select event: checkout.session.completed
5. Copy signing secret
6. Add to Netlify env vars: STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Step 3: Test Payment (20 min)
```
1. Go to /payment.html
2. Click "Prepare My IRS Response"
3. Use test card: 4242 4242 4242 4242
4. Complete payment
5. Verify redirect to /thank-you.html
6. Check "Payment Confirmed!" message
```

### Step 4: Verify Database (5 min)
```sql
-- In Supabase SQL Editor
SELECT * FROM tlh_letters 
WHERE stripe_session_id LIKE 'cs_test_%'
ORDER BY created_at DESC
LIMIT 1;
```
**Expected:** Record with status = 'paid'

### Step 5: Test Upload Access (5 min)
```
1. Click "Upload My IRS Letter"
2. Verify upload page loads
3. Upload test file
4. Verify analysis works
```

**✅ Day 2 Complete When:**
- Payment completes successfully
- Database record created
- Upload page accessible
- Cannot bypass payment

---

## 📋 CHECKLIST

### Before Starting:
- [ ] Have Supabase account and project
- [ ] Have Stripe account (test mode)
- [ ] Have Netlify account
- [ ] Code is in Git repository

### Day 1:
- [ ] Migration applied
- [ ] Validation script passes
- [ ] Local testing works
- [ ] No database errors

### Day 2:
- [ ] Code deployed
- [ ] Webhook configured
- [ ] Test payment works
- [ ] Database record created
- [ ] Upload access granted

### Ready for Day 3:
- [ ] All Day 1 tests pass
- [ ] All Day 2 tests pass
- [ ] 5 successful test transactions
- [ ] No errors in logs

---

## 🆘 QUICK TROUBLESHOOTING

### "Table tlh_letters does not exist"
→ Run Day 1 migration in Supabase SQL Editor

### "Payment verification failed"
→ Check Stripe webhook is configured with correct URL

### "Cannot access upload page"
→ Complete a test payment first

### "Webhook not receiving events"
→ Verify STRIPE_WEBHOOK_SECRET is set in Netlify

### "Validation script fails"
→ Check SUPABASE_SERVICE_ROLE_KEY is set correctly

---

## 📞 NEED HELP?

**Check These First:**
1. Netlify function logs (for errors)
2. Supabase logs (for database errors)
3. Stripe dashboard (for webhook events)
4. Browser console (for frontend errors)

**Review Documentation:**
- `DAY-1-CHECKLIST.md` - Detailed Day 1 steps
- `DAY-2-COMPLETE-CHECKLIST.md` - Detailed Day 2 steps
- `CRITICAL-FIXES-SUMMARY.md` - Overview of all fixes

---

## ⏱️ TIME ESTIMATES

| Task | Time | Can Skip? |
|------|------|-----------|
| Day 1 Migration | 10 min | ❌ No |
| Day 1 Validation | 5 min | ❌ No |
| Day 1 Testing | 15 min | ❌ No |
| Day 2 Deployment | 10 min | ❌ No |
| Day 2 Webhook Setup | 15 min | ❌ No |
| Day 2 Testing | 30 min | ❌ No |
| **Total** | **1.5 hours** | **None** |

**Note:** These are MINIMUM times. Budget 2-4 hours for troubleshooting.

---

## ✅ SUCCESS CRITERIA

**You're ready to launch when:**
1. ✅ Day 1 validation passes
2. ✅ Day 2 payment flow works
3. ✅ 5 successful test transactions
4. ✅ Database tracks all payments
5. ✅ Cannot bypass payment
6. ✅ No errors in logs

---

**Start Here:** Apply Day 1 migration first, then validate before moving to Day 2.

**Questions?** Review the detailed checklists in:
- `DAY-1-CHECKLIST.md`
- `DAY-2-COMPLETE-CHECKLIST.md`
