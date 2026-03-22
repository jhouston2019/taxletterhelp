# Tax Letter Defense Pro - Quick Deploy Guide
## Get Live in 2 Hours

**Target:** Deploy a working site to production  
**Time:** 2 hours  
**Difficulty:** Easy

---

## 🚀 STEP 1: SUPABASE (15 minutes)

### Create Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Name: `Tax Letter Defense Pro`
4. Generate strong password (save it!)
5. Wait for provisioning

### Apply Database Migration
1. Go to SQL Editor
2. Open `supabase/migrations/20260224_fix_schema_v2.sql`
3. Copy entire file
4. Paste in SQL Editor
5. Click "Run"
6. Verify success message

### Get API Keys
1. Go to Settings > API
2. Copy these values:
   - Project URL
   - anon public key
   - service_role key (secret!)

---

## 🚀 STEP 2: STRIPE (20 minutes)

### Create Account
1. Go to https://dashboard.stripe.com/register
2. Complete signup

### Create Product
1. Go to Products
2. Click "Add product"
3. Name: `IRS Notice Response`
4. Price: `$19.00` one-time
5. Copy the Price ID (starts with `price_`)

### Get API Keys
1. Go to Developers > API keys
2. Copy:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)

---

## 🚀 STEP 3: OPENAI (10 minutes)

### Create Account
1. Go to https://platform.openai.com/signup
2. Complete signup
3. Add payment method

### Create API Key
1. Go to API keys
2. Click "Create new secret key"
3. Name: `Tax Letter Defense Pro`
4. Copy key (starts with `sk-proj-`)
5. **Save immediately** (can't view again)

---

## 🚀 STEP 4: CONFIGURE .ENV (5 minutes)

Open `.env` file and update these values:

```bash
# Supabase (from Step 1)
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (from Step 3)
OPENAI_API_KEY=sk-proj-...

# Stripe (from Step 2)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_PRICE_RESPONSE=price_...

# Site (update after Netlify deploy)
SITE_URL=http://localhost:8888

# Admin (generate strong key)
ADMIN_KEY=YOUR-STRONG-RANDOM-KEY-HERE
```

**Generate Admin Key:**
```bash
# Mac/Linux:
openssl rand -base64 32

# Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## 🚀 STEP 5: TEST LOCALLY (15 minutes)

### Install Dependencies
```bash
npm install
```

### Run Validation
```bash
node scripts/validate-setup.js
```

### Start Local Server
```bash
netlify dev
```

### Test Flow
1. Open http://localhost:8888
2. Click "Prepare My IRS Response"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. Upload sample letter
6. Verify analysis works

---

## 🚀 STEP 6: DEPLOY TO NETLIFY (20 minutes)

### Connect Repository
1. Go to https://app.netlify.com
2. Click "Add new site"
3. Choose "Import an existing project"
4. Select GitHub repository
5. **Don't deploy yet!**

### Add Environment Variables
1. Go to Site settings > Environment variables
2. Copy ALL variables from `.env` file
3. Update `SITE_URL` to your Netlify URL (e.g., `https://your-site.netlify.app`)

### Deploy
1. Go to Deploys
2. Click "Trigger deploy"
3. Wait 2-5 minutes
4. Check deploy log for errors

---

## 🚀 STEP 7: CONFIGURE STRIPE WEBHOOK (10 minutes)

### Create Webhook
1. Go to Stripe > Developers > Webhooks
2. Click "Add endpoint"
3. URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
4. Events: Select `checkout.session.completed`
5. Click "Add endpoint"

### Update Environment Variable
1. Copy webhook signing secret
2. Go to Netlify > Environment variables
3. Add `STRIPE_WEBHOOK_SECRET` with the secret
4. Redeploy site

---

## 🚀 STEP 8: FINAL TEST (15 minutes)

### Test Complete Flow
1. Go to your live site
2. Complete full payment flow with test card
3. Upload letter
4. Generate response
5. Download PDF

### Verify Backend
1. Check Stripe dashboard for payment
2. Check Supabase for database record
3. Check Netlify function logs

### If Everything Works
**🎉 YOU'RE LIVE!**

---

## 📋 QUICK REFERENCE

### Test Credit Card
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### Validation Command
```bash
node scripts/validate-setup.js
```

### View Function Logs
```bash
netlify logs:function analyze-letter
netlify logs:function stripe-webhook
```

### Database Query
```sql
-- Check recent payments
SELECT id, user_email, status, created_at 
FROM tlh_letters 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🆘 COMMON ISSUES

### "Table doesn't exist"
→ Run database migration in Supabase SQL Editor

### "Webhook signature failed"
→ Check STRIPE_WEBHOOK_SECRET is set correctly

### "OpenAI API error"
→ Verify API key and billing is active

### "Payment not verified"
→ Check webhook is configured and firing

### "Function timeout"
→ Increase timeout in netlify.toml (default is 10s)

---

## 📞 NEED HELP?

1. Check Netlify function logs
2. Check Supabase logs
3. Check Stripe dashboard
4. Review error messages in Sentry (if configured)

---

**Total Time:** ~2 hours  
**Difficulty:** Easy to Moderate  
**Result:** Fully functional production site

**Good luck with your launch! 🚀**
