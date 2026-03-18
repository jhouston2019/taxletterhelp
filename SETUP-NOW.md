# 🚀 TaxLetterHelp - Setup Instructions
## Get Your Site Running RIGHT NOW

**Time Required:** 2 hours  
**Last Updated:** March 17, 2026

---

## ⚡ QUICK START (Do This First)

### 1. Install Dependencies (2 minutes)

```bash
npm install
```

### 2. Configure Environment Variables (5 minutes)

The `.env` file has been created for you. Open it and replace these values:

**CRITICAL - Must Configure:**
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_PRICE_RESPONSE=price_...
ADMIN_KEY=<generate-strong-key>
```

**Where to Get These:**
- Supabase: https://app.supabase.com (create project first)
- OpenAI: https://platform.openai.com/api-keys
- Stripe: https://dashboard.stripe.com/apikeys
- Admin Key: Run `openssl rand -base64 32` (Mac/Linux) or see below for Windows

**Windows PowerShell - Generate Admin Key:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Set Up Supabase Database (10 minutes)

**A. Create Supabase Project:**
1. Go to https://app.supabase.com
2. Click "New Project"
3. Name: `taxletterhelp`
4. Generate password (save it!)
5. Wait 2-3 minutes

**B. Apply Database Migration:**
1. Go to SQL Editor: https://app.supabase.com/project/YOUR-PROJECT/sql
2. Click "New Query"
3. Open file: `supabase/migrations/20260224_fix_schema_v2.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. Wait for success message

**C. Verify Table Created:**
```sql
SELECT * FROM tlh_letters LIMIT 1;
```
Should return empty result (no error = success)

**D. Get API Keys:**
1. Go to Settings > API
2. Copy `Project URL` → Update `VITE_SUPABASE_URL` and `SUPABASE_URL` in `.env`
3. Copy `anon public` → Update `VITE_SUPABASE_ANON_KEY` in `.env`
4. Copy `service_role` → Update `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### 4. Set Up Stripe (15 minutes)

**A. Create Stripe Account:**
1. Go to https://dashboard.stripe.com/register
2. Complete signup and verification

**B. Create Product:**
1. Go to Products: https://dashboard.stripe.com/products
2. Click "Add product"
3. Name: `IRS Notice Response`
4. Description: `Professional IRS notice response preparation`
5. Pricing: One-time payment
6. Price: `$19.00 USD`
7. Click "Save product"
8. Copy the `Price ID` → Update `STRIPE_PRICE_RESPONSE` in `.env`

**C. Get API Keys:**
1. Go to Developers > API keys: https://dashboard.stripe.com/test/apikeys
2. Copy `Publishable key` → Update `STRIPE_PUBLIC_KEY` in `.env`
3. Reveal and copy `Secret key` → Update `STRIPE_SECRET_KEY` in `.env`

### 5. Set Up OpenAI (10 minutes)

**A. Create Account:**
1. Go to https://platform.openai.com/signup
2. Complete signup
3. Verify email

**B. Add Payment Method:**
1. Go to Settings > Billing
2. Add credit card
3. Set usage limit: $50/month (recommended)

**C. Create API Key:**
1. Go to API keys: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name: `TaxLetterHelp Production`
4. Copy key → Update `OPENAI_API_KEY` in `.env`
5. **SAVE IT NOW** (you can't view it again)

### 6. Test Locally (15 minutes)

```bash
# Start local development server
netlify dev

# In another terminal, run validation
node scripts/validate-setup.js
```

**Test the flow:**
1. Open http://localhost:8888
2. Click "Prepare My IRS Response"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete payment
5. Upload a sample IRS letter (PDF or image)
6. Verify analysis appears
7. Generate response
8. Download PDF

**If everything works locally, proceed to deployment!**

---

## 🌐 DEPLOY TO PRODUCTION (30 minutes)

### 7. Deploy to Netlify

**A. Connect Repository:**
1. Go to https://app.netlify.com
2. Click "Add new site" > "Import an existing project"
3. Choose "Deploy with GitHub"
4. Authorize Netlify
5. Select your repository
6. **Don't click Deploy yet!**

**B. Configure Environment Variables:**
1. Go to Site settings > Environment variables
2. Click "Add a variable" for each:

```bash
VITE_SUPABASE_URL=<from-your-env-file>
VITE_SUPABASE_ANON_KEY=<from-your-env-file>
SUPABASE_URL=<from-your-env-file>
SUPABASE_SERVICE_ROLE_KEY=<from-your-env-file>
OPENAI_API_KEY=<from-your-env-file>
STRIPE_SECRET_KEY=<from-your-env-file>
STRIPE_PUBLIC_KEY=<from-your-env-file>
STRIPE_PRICE_RESPONSE=<from-your-env-file>
ADMIN_KEY=<from-your-env-file>
```

**IMPORTANT:** Update `SITE_URL`:
```bash
SITE_URL=https://YOUR-SITE-NAME.netlify.app
```

**C. Deploy:**
1. Go to Deploys tab
2. Click "Deploy site"
3. Wait 2-5 minutes
4. Check deploy log for errors
5. Click on the deployed URL to test

### 8. Configure Stripe Webhook

**A. Create Webhook Endpoint:**
1. Go to Stripe > Developers > Webhooks: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
4. Description: `Payment completion handler`
5. Events to send: Click "Select events"
6. Search for and select: `checkout.session.completed`
7. Click "Add events"
8. Click "Add endpoint"

**B. Update Webhook Secret:**
1. Click on your newly created webhook
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Go to Netlify > Site settings > Environment variables
5. Add new variable:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (the secret you copied)
6. Click "Save"

**C. Redeploy:**
1. Go to Deploys tab
2. Click "Trigger deploy"
3. Wait for deployment

### 9. Final Production Test (15 minutes)

**A. Test Payment Flow:**
1. Go to your live site
2. Click "Prepare My IRS Response"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Verify redirect to thank-you page

**B. Test Upload and Analysis:**
1. Upload a sample IRS letter
2. Wait for analysis (30-60 seconds)
3. Verify analysis appears with proper formatting

**C. Test Response Generation:**
1. Enter your position
2. Click "Generate Response"
3. Wait for response (30-60 seconds)
4. Verify response letter appears

**D. Test Downloads:**
1. Click "Download PDF"
2. Verify PDF downloads and opens correctly
3. Click "Download DOCX"
4. Verify DOCX downloads and opens correctly

**E. Verify Backend:**
1. Check Stripe dashboard for test payment
2. Check Supabase database:
```sql
SELECT * FROM tlh_letters ORDER BY created_at DESC LIMIT 5;
```
3. Check Netlify function logs for any errors

---

## ✅ YOU'RE LIVE!

If all tests pass, your site is ready for real users!

### Switch to Live Mode (When Ready)

**A. Stripe Live Keys:**
1. Go to Stripe dashboard
2. Toggle to "Live mode" (top right)
3. Go to Developers > API keys
4. Copy live keys
5. Update in Netlify environment variables:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_PUBLIC_KEY=pk_live_...`

**B. Create Live Product:**
1. In Live mode, create product again
2. Price: $19.00 one-time
3. Copy new Price ID
4. Update `STRIPE_PRICE_RESPONSE` in Netlify

**C. Create Live Webhook:**
1. In Live mode, create webhook endpoint
2. Same URL as test mode
3. Select `checkout.session.completed`
4. Copy signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in Netlify

**D. Redeploy:**
```bash
# Trigger new deployment with live keys
```

---

## 📊 MONITORING

### Daily Checks (First Week)
- [ ] Check Netlify function logs
- [ ] Check Stripe for payments
- [ ] Check Supabase for database records
- [ ] Monitor for errors

### Tools to Set Up (Optional)
- **Sentry:** Error tracking (https://sentry.io)
- **UptimeRobot:** Uptime monitoring (https://uptimerobot.com)
- **Google Analytics:** User tracking

---

## 🆘 TROUBLESHOOTING

### "Cannot connect to Supabase"
1. Verify URL and keys are correct
2. Check Supabase project is active
3. Verify migration was applied

### "Stripe webhook not firing"
1. Check webhook URL is correct
2. Verify webhook secret is set in Netlify
3. Check Stripe webhook logs for delivery attempts

### "OpenAI API error"
1. Verify API key is correct
2. Check billing is active
3. Verify usage limits not exceeded

### "Payment not verified"
1. Wait 30 seconds (webhook may be delayed)
2. Check Stripe webhook logs
3. Verify database record was created
4. Check Netlify function logs

---

## 📞 NEED HELP?

**Check Logs:**
```bash
# Netlify function logs
netlify logs:function analyze-letter
netlify logs:function stripe-webhook

# Or view in dashboard:
# https://app.netlify.com/sites/YOUR-SITE/logs
```

**Check Database:**
```sql
-- Recent records
SELECT * FROM tlh_letters ORDER BY created_at DESC LIMIT 10;

-- Payment status
SELECT status, COUNT(*) FROM tlh_letters GROUP BY status;
```

---

## 🎉 SUCCESS CRITERIA

Your site is ready when:
- ✅ Local testing passes
- ✅ Validation script passes
- ✅ Deployed to Netlify
- ✅ Payment flow works end-to-end
- ✅ Upload and analysis work
- ✅ Response generation works
- ✅ Downloads work (PDF/DOCX)
- ✅ Webhook creates database records
- ✅ No errors in function logs

---

**Total Time:** ~2 hours  
**Difficulty:** Moderate  
**Result:** Production-ready site

**Let's go! 🚀**
