# TaxLetterHelp - Deployment Ready Checklist
## Complete Guide to Launch

**Last Updated:** March 17, 2026  
**Status:** Ready for Implementation

---

## 🎯 OVERVIEW

This checklist guides you through deploying TaxLetterHelp from local development to production. Follow each step in order.

**Estimated Time:** 4-6 hours  
**Difficulty:** Intermediate  
**Prerequisites:** Basic command line knowledge, accounts created

---

## ✅ PHASE 1: LOCAL SETUP (30 minutes)

### Step 1.1: Configure Environment Variables

```bash
# 1. Open .env file in root directory
# 2. Replace all placeholder values with real API keys
# 3. Verify no values contain "YOUR-" or "CHANGE-THIS"
```

**Required Variables:**
- [ ] `VITE_SUPABASE_URL` - From Supabase project settings
- [ ] `VITE_SUPABASE_ANON_KEY` - From Supabase project settings
- [ ] `SUPABASE_URL` - Same as VITE_SUPABASE_URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase project settings (secret!)
- [ ] `OPENAI_API_KEY` - From OpenAI platform
- [ ] `STRIPE_SECRET_KEY` - From Stripe dashboard
- [ ] `STRIPE_PUBLIC_KEY` - From Stripe dashboard
- [ ] `STRIPE_PRICE_RESPONSE` - Price ID from Stripe
- [ ] `SITE_URL` - Set to `http://localhost:8888` for local testing
- [ ] `ADMIN_KEY` - Generate with: `openssl rand -base64 32`

**Optional but Recommended:**
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe webhook configuration
- [ ] `SENTRY_DSN` - From Sentry project settings
- [ ] `SENDGRID_API_KEY` - From SendGrid dashboard

### Step 1.2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install function dependencies
cd netlify/functions
npm install
cd ../..
```

### Step 1.3: Validate Setup

```bash
# Run validation script
node scripts/validate-setup.js

# Expected output: "ALL VALIDATION TESTS PASSED"
# If errors, fix them before proceeding
```

---

## ✅ PHASE 2: SUPABASE SETUP (30 minutes)

### Step 2.1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Name: `taxletterhelp-prod`
4. Database Password: Generate strong password (save it!)
5. Region: Choose closest to your users
6. Click "Create new project"
7. Wait 2-3 minutes for project to provision

### Step 2.2: Apply Database Migration

1. Go to SQL Editor: https://app.supabase.com/project/YOUR-PROJECT/sql
2. Click "New Query"
3. Open `supabase/migrations/20260224_fix_schema_v2.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click "Run"
7. Verify success message appears

**Verification:**
```sql
-- Run this query to verify table exists
SELECT * FROM tlh_letters LIMIT 1;

-- Should return empty result (no error)
```

### Step 2.3: Configure Storage

1. Go to Storage: https://app.supabase.com/project/YOUR-PROJECT/storage/buckets
2. Click "New Bucket"
3. Name: `letters`
4. Public: **NO** (keep private)
5. File size limit: 10 MB
6. Allowed MIME types: `application/pdf, image/jpeg, image/png`
7. Click "Create bucket"

### Step 2.4: Copy API Keys

1. Go to Settings > API: https://app.supabase.com/project/YOUR-PROJECT/settings/api
2. Copy `Project URL` → Update `VITE_SUPABASE_URL` and `SUPABASE_URL` in `.env`
3. Copy `anon public` key → Update `VITE_SUPABASE_ANON_KEY` in `.env`
4. Copy `service_role` key → Update `SUPABASE_SERVICE_ROLE_KEY` in `.env` (keep secret!)

---

## ✅ PHASE 3: STRIPE SETUP (45 minutes)

### Step 3.1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete account setup
3. Verify email address
4. Complete business profile

### Step 3.2: Create Product and Price

1. Go to Products: https://dashboard.stripe.com/products
2. Click "Add product"
3. Name: `IRS Notice Response`
4. Description: `Professional IRS notice response preparation`
5. Pricing model: `One-time`
6. Price: `$19.00 USD`
7. Click "Save product"
8. Copy the `Price ID` (starts with `price_`) → Update `STRIPE_PRICE_RESPONSE` in `.env`

### Step 3.3: Get API Keys

**For Testing:**
1. Go to Developers > API keys: https://dashboard.stripe.com/test/apikeys
2. Copy `Publishable key` → Update `STRIPE_PUBLIC_KEY` in `.env`
3. Copy `Secret key` → Update `STRIPE_SECRET_KEY` in `.env`

**For Production (after testing):**
1. Toggle to "Live mode" (top right)
2. Go to Developers > API keys: https://dashboard.stripe.com/apikeys
3. Copy live keys and update `.env`

### Step 3.4: Configure Webhook (After Deployment)

**Note:** Do this AFTER deploying to Netlify (Step 4)

1. Go to Developers > Webhooks: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-DOMAIN.netlify.app/.netlify/functions/stripe-webhook`
4. Description: `Payment completion handler`
5. Events to send: Select `checkout.session.completed`
6. Click "Add endpoint"
7. Click "Reveal" on Signing secret
8. Copy signing secret → Update `STRIPE_WEBHOOK_SECRET` in `.env` and Netlify

---

## ✅ PHASE 4: NETLIFY DEPLOYMENT (1 hour)

### Step 4.1: Create Netlify Account

1. Go to https://app.netlify.com/signup
2. Sign up with GitHub (recommended)
3. Authorize Netlify to access your repositories

### Step 4.2: Connect Repository

1. Click "Add new site" > "Import an existing project"
2. Choose "Deploy with GitHub"
3. Select your `tax-letter-help-ai` repository
4. Branch to deploy: `main`
5. Build command: (leave empty)
6. Publish directory: (leave empty - using root)
7. **Don't click Deploy yet!**

### Step 4.3: Configure Environment Variables

1. Go to Site settings > Environment variables
2. Add ALL variables from your `.env` file:

```bash
# Copy these from your .env file
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_PUBLIC_KEY=...
STRIPE_PRICE_RESPONSE=...
STRIPE_WEBHOOK_SECRET=...
SITE_URL=https://YOUR-SITE.netlify.app
ADMIN_KEY=...
SENTRY_DSN=... (if using)
SENDGRID_API_KEY=... (if using)
```

**CRITICAL:** Update `SITE_URL` to your actual Netlify URL

### Step 4.4: Deploy

1. Go back to Deploys tab
2. Click "Deploy site"
3. Wait for deployment to complete (2-5 minutes)
4. Check deploy log for errors

### Step 4.5: Configure Custom Domain (Optional)

1. Go to Domain settings
2. Click "Add custom domain"
3. Enter: `taxletterhelp.pro`
4. Follow DNS configuration instructions
5. Wait for SSL certificate (automatic, 5-10 minutes)

---

## ✅ PHASE 5: OPENAI SETUP (15 minutes)

### Step 5.1: Create OpenAI Account

1. Go to https://platform.openai.com/signup
2. Complete account setup
3. Verify email and phone

### Step 5.2: Add Payment Method

1. Go to Settings > Billing: https://platform.openai.com/account/billing
2. Add credit card
3. Set spending limit: $50/month (recommended for testing)

### Step 5.3: Create API Key

1. Go to API keys: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name: `TaxLetterHelp Production`
4. Copy key → Update `OPENAI_API_KEY` in `.env` and Netlify
5. **Save key immediately** (can't view again)

---

## ✅ PHASE 6: ERROR TRACKING (30 minutes) - OPTIONAL

### Step 6.1: Create Sentry Account

1. Go to https://sentry.io/signup
2. Sign up (free tier available)
3. Create organization: `TaxLetterHelp`

### Step 6.2: Create Project

1. Click "Create Project"
2. Platform: `Node.js`
3. Project name: `taxletterhelp-prod`
4. Click "Create Project"

### Step 6.3: Get DSN

1. Go to Settings > Projects > taxletterhelp-prod
2. Click "Client Keys (DSN)"
3. Copy DSN → Update `SENTRY_DSN` in `.env` and Netlify

### Step 6.4: Install Sentry

```bash
npm install @sentry/node @sentry/browser
```

---

## ✅ PHASE 7: TESTING (1 hour)

### Step 7.1: Test Payment Flow

1. Go to your deployed site
2. Click "Prepare My IRS Response"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. ZIP: Any 5 digits
7. Complete payment
8. Verify redirect to thank-you page
9. Check Stripe dashboard for payment
10. Check Supabase database for record

**Verification Query:**
```sql
SELECT * FROM tlh_letters 
WHERE status = 'paid' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Step 7.2: Test Upload and Analysis

1. From thank-you page, click "Upload Letter"
2. Upload a sample IRS letter (PDF or image)
3. Wait for analysis (30-60 seconds)
4. Verify analysis appears
5. Check for proper notice classification
6. Verify risk analysis works

### Step 7.3: Test Response Generation

1. After analysis, enter your position
2. Click "Generate Response"
3. Wait for response (30-60 seconds)
4. Verify response letter appears
5. Test PDF download
6. Test DOCX download

### Step 7.4: Test Error Handling

1. Try uploading without payment (should block)
2. Try uploading invalid file (should error gracefully)
3. Try with missing required fields (should validate)
4. Check Sentry for any errors logged

### Step 7.5: Run Validation Script

```bash
# Update SITE_URL in .env to production URL
# Then run validation
node scripts/validate-setup.js

# Should pass all tests
```

---

## ✅ PHASE 8: MONITORING (30 minutes)

### Step 8.1: Set Up Uptime Monitoring

1. Go to https://uptimerobot.com
2. Sign up (free)
3. Add monitor:
   - Type: HTTPS
   - URL: `https://YOUR-DOMAIN/`
   - Name: `TaxLetterHelp Main`
   - Interval: 5 minutes
4. Add second monitor for upload page
5. Set up email alerts

### Step 8.2: Configure Google Analytics (Optional)

1. Go to https://analytics.google.com
2. Create account and property
3. Get tracking ID
4. Add to all HTML pages in `<head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## ✅ PHASE 9: SECURITY HARDENING (30 minutes)

### Step 9.1: Verify Security Settings

- [ ] `.env` file is in `.gitignore`
- [ ] Service role key is NEVER exposed in frontend
- [ ] Admin key is strong (32+ characters)
- [ ] RLS is enabled on tlh_letters table
- [ ] Stripe webhook signature is verified
- [ ] File upload size limits are enforced

### Step 9.2: Test Admin Mode

1. Open browser console
2. Run: `localStorage.setItem('admin_mode', 'YOUR-ADMIN-KEY')`
3. Refresh page
4. Verify admin features work
5. Clear: `localStorage.removeItem('admin_mode')`

### Step 9.3: Review Netlify Security Headers

Check that security headers are set in `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## ✅ PHASE 10: GO LIVE (15 minutes)

### Step 10.1: Switch to Production Mode

1. Update Stripe to live mode keys
2. Update all environment variables in Netlify
3. Redeploy site
4. Test with real payment (small amount)
5. Refund test payment

### Step 10.2: Final Checks

- [ ] All environment variables set in Netlify
- [ ] Stripe webhook configured and working
- [ ] Database migration applied
- [ ] Payment flow tested end-to-end
- [ ] Upload and analysis working
- [ ] Response generation working
- [ ] Downloads (PDF/DOCX) working
- [ ] Error tracking active
- [ ] Uptime monitoring active
- [ ] Custom domain configured (if using)
- [ ] SSL certificate active

### Step 10.3: Launch!

1. Announce launch
2. Monitor error logs closely
3. Check Stripe dashboard for payments
4. Check Supabase for database activity
5. Monitor Sentry for errors

---

## 📊 POST-LAUNCH MONITORING

### Daily (First Week)
- [ ] Check Sentry for errors
- [ ] Check Stripe for payments
- [ ] Check Supabase for database issues
- [ ] Review Netlify function logs
- [ ] Monitor uptime

### Weekly
- [ ] Review error rates
- [ ] Check conversion rates
- [ ] Analyze user feedback
- [ ] Review OpenAI costs
- [ ] Check Stripe fees

### Monthly
- [ ] Review total costs
- [ ] Analyze user metrics
- [ ] Plan improvements
- [ ] Update documentation

---

## 🆘 TROUBLESHOOTING

### Payment Not Recording
1. Check Stripe webhook is configured
2. Verify webhook secret in Netlify
3. Check Netlify function logs
4. Verify database table exists

### Analysis Failing
1. Check OpenAI API key
2. Verify OpenAI billing active
3. Check function timeout (increase if needed)
4. Review error logs in Sentry

### Database Errors
1. Verify migration was applied
2. Check RLS policies
3. Verify service role key
4. Test connection with validation script

### Deployment Failing
1. Check Netlify build logs
2. Verify all env vars set
3. Check for syntax errors
4. Verify dependencies installed

---

## 📞 SUPPORT RESOURCES

- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **OpenAI Docs:** https://platform.openai.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Sentry Docs:** https://docs.sentry.io

---

## ✅ COMPLETION CHECKLIST

### Critical (Must Complete)
- [ ] Phase 1: Local Setup
- [ ] Phase 2: Supabase Setup
- [ ] Phase 3: Stripe Setup
- [ ] Phase 4: Netlify Deployment
- [ ] Phase 5: OpenAI Setup
- [ ] Phase 7: Testing (all tests pass)
- [ ] Phase 9: Security Hardening
- [ ] Phase 10: Go Live

### Recommended
- [ ] Phase 6: Error Tracking (Sentry)
- [ ] Phase 8: Monitoring (UptimeRobot)
- [ ] Google Analytics

### Optional
- [ ] Custom domain
- [ ] SendGrid email notifications
- [ ] Advanced monitoring

---

**🎉 CONGRATULATIONS!**

If all checkboxes are complete, your TaxLetterHelp site is live and ready to help taxpayers!

**Next Steps:**
1. Monitor closely for first 48 hours
2. Collect user feedback
3. Fix any issues discovered
4. Begin marketing

---

**Document Version:** 1.0  
**Last Updated:** March 17, 2026  
**Status:** Production Ready
