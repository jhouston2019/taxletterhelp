# TaxLetterHelp - Launch Action Plan
## Prioritized Task List to Production

**Goal:** Fix critical issues and launch within 2-3 weeks  
**Current Status:** Not launch-ready (6.5/10)  
**Target Status:** Production-ready (9/10)

---

## 🔴 CRITICAL PATH (Must Complete Before Launch)

### Day 1-2: Database Fix

#### Task 1.1: Create tlh_letters Table Migration
**Priority:** CRITICAL  
**Time:** 2 hours  
**Owner:** Backend Developer

**Action:**
```sql
-- File: supabase/migrations/20260224_create_tlh_letters_table.sql

CREATE TABLE IF NOT EXISTS public.tlh_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  stripe_session_id TEXT,
  price_id TEXT,
  letter_text TEXT,
  analysis JSONB,
  summary TEXT,
  status TEXT DEFAULT 'pending',
  ai_response TEXT,
  risk_level TEXT,
  requires_professional_review BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.tlh_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own letters"
  ON public.tlh_letters
  FOR SELECT
  USING (auth.uid()::text = user_email OR user_email IS NULL);

CREATE POLICY "Users can insert their own letters"
  ON public.tlh_letters
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_email OR user_email IS NULL);

-- Add indexes for performance
CREATE INDEX idx_tlh_letters_user_email ON public.tlh_letters(user_email);
CREATE INDEX idx_tlh_letters_stripe_session ON public.tlh_letters(stripe_session_id);
CREATE INDEX idx_tlh_letters_created_at ON public.tlh_letters(created_at DESC);
```

**Verification:**
```bash
# Run migration in Supabase SQL Editor
# Verify table exists
SELECT * FROM tlh_letters LIMIT 1;
```

---

### Day 2-3: Payment Flow Completion

#### Task 2.1: Create Thank You Page
**Priority:** CRITICAL  
**Time:** 1 hour  
**Owner:** Frontend Developer

**Action:**
Create `thank-you.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful | TaxLetterHelp</title>
</head>
<body>
    <h1>Payment Successful!</h1>
    <p>Your payment has been processed. You can now upload your IRS letter.</p>
    <a href="/upload.html">Upload Your Letter</a>
    
    <script>
        // Store payment success in localStorage
        localStorage.setItem('paid', 'true');
        
        // Get session ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (sessionId) {
            localStorage.setItem('stripe_session_id', sessionId);
        }
    </script>
</body>
</html>
```

#### Task 2.2: Implement Payment Webhook
**Priority:** CRITICAL  
**Time:** 4 hours  
**Owner:** Backend Developer

**Action:**
Update `netlify/functions/stripe-webhook.js`:
```javascript
const Stripe = require('stripe');
const { getSupabaseAdmin } = require('./_supabase.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let stripeEvent;
  
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
  
  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      
      // Store payment in database
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('tlh_letters')
        .insert({
          stripe_session_id: session.id,
          user_email: session.customer_email,
          price_id: session.metadata.price_id || process.env.STRIPE_PRICE_RESPONSE,
          status: 'paid'
        });
      
      if (error) {
        console.error('Database error:', error);
      }
      
      // TODO: Send confirmation email
      
      break;
    
    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }
  
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
```

#### Task 2.3: Update Checkout Session
**Priority:** CRITICAL  
**Time:** 1 hour  
**Owner:** Backend Developer

**Action:**
Update `netlify/functions/create-checkout-session.js`:
```javascript
// Change success_url to include session_id
success_url: `${process.env.SITE_URL}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
```

#### Task 2.4: Add Payment Verification
**Priority:** CRITICAL  
**Time:** 2 hours  
**Owner:** Backend Developer

**Action:**
Create `netlify/functions/verify-payment.js`:
```javascript
const { getSupabaseAdmin } = require('./_supabase.js');

exports.handler = async (event) => {
  const { sessionId } = JSON.parse(event.body || '{}');
  
  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Session ID required' })
    };
  }
  
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('tlh_letters')
    .select('id, status')
    .eq('stripe_session_id', sessionId)
    .single();
  
  if (error || !data) {
    return {
      statusCode: 404,
      body: JSON.stringify({ paid: false })
    };
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      paid: data.status === 'paid',
      recordId: data.id 
    })
  };
};
```

**Verification:**
1. Test payment flow end-to-end with Stripe test mode
2. Verify webhook receives events
3. Verify database records payment
4. Verify upload page checks payment

---

### Day 3-4: Production Environment Setup

#### Task 3.1: Create Production Supabase Project
**Priority:** CRITICAL  
**Time:** 1 hour  
**Owner:** DevOps

**Action:**
1. Go to https://supabase.com
2. Create new project: "taxletterhelp-prod"
3. Run all migrations in SQL Editor
4. Create storage bucket: "letters" (private)
5. Copy project URL and anon key

#### Task 3.2: Configure Stripe Production
**Priority:** CRITICAL  
**Time:** 1 hour  
**Owner:** DevOps

**Action:**
1. Go to https://dashboard.stripe.com
2. Switch to production mode
3. Create product: "IRS Letter Response" ($19 one-time)
4. Copy price ID
5. Set up webhook: `https://taxletterhelp.pro/.netlify/functions/stripe-webhook`
6. Select events: `checkout.session.completed`
7. Copy webhook secret

#### Task 3.3: Set Netlify Environment Variables
**Priority:** CRITICAL  
**Time:** 1 hour  
**Owner:** DevOps

**Action:**
In Netlify dashboard, add all environment variables:
```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# OpenAI
OPENAI_API_KEY=sk-xxx...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_PUBLIC_KEY=pk_live_xxx...
STRIPE_PRICE_RESPONSE=price_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...

# Site
SITE_URL=https://taxletterhelp.pro

# Admin
ADMIN_KEY=[generate strong random key]

# SendGrid (optional for launch)
SENDGRID_API_KEY=SG.xxx...
SUPPORT_EMAIL=info@axis-strategic-media.com
```

**Verification:**
```bash
# Deploy and test
netlify deploy --prod
```

---

### Day 4-5: Error Tracking & Monitoring

#### Task 4.1: Integrate Sentry
**Priority:** CRITICAL  
**Time:** 2 hours  
**Owner:** Backend Developer

**Action:**
1. Create Sentry account: https://sentry.io
2. Create project: "taxletterhelp"
3. Install Sentry:
```bash
npm install @sentry/node @sentry/browser
```

4. Add to all Netlify functions:
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.CONTEXT || 'development'
});

exports.handler = async (event) => {
  try {
    // ... function code
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};
```

5. Add to frontend:
```html
<script src="https://browser.sentry-cdn.com/xxx/bundle.min.js"></script>
<script>
  Sentry.init({ dsn: 'https://xxx@sentry.io/xxx' });
</script>
```

#### Task 4.2: Set Up Uptime Monitoring
**Priority:** HIGH  
**Time:** 30 minutes  
**Owner:** DevOps

**Action:**
1. Create UptimeRobot account: https://uptimerobot.com
2. Add monitor: https://taxletterhelp.pro (every 5 minutes)
3. Add monitor: https://taxletterhelp.pro/upload.html
4. Set up email alerts

#### Task 4.3: Configure Google Analytics
**Priority:** HIGH  
**Time:** 30 minutes  
**Owner:** Marketing

**Action:**
1. Create Google Analytics 4 property
2. Add tracking code to all pages
3. Set up conversion goals:
   - Payment completed
   - Letter uploaded
   - Response downloaded

---

### Day 5-7: Testing

#### Task 5.1: End-to-End Payment Testing
**Priority:** CRITICAL  
**Time:** 2 hours  
**Owner:** QA

**Test Cases:**
1. ✅ Click "Prepare My IRS Response" on landing page
2. ✅ Redirected to payment page
3. ✅ Click payment button
4. ✅ Complete Stripe checkout (test mode)
5. ✅ Redirected to thank-you page
6. ✅ Session ID in URL
7. ✅ localStorage has 'paid' = 'true'
8. ✅ Click "Upload Your Letter"
9. ✅ Upload page loads (no redirect to pricing)
10. ✅ Upload PDF file
11. ✅ Analysis completes
12. ✅ Response generates
13. ✅ Download PDF works
14. ✅ Download DOCX works
15. ✅ Database record created with payment info

#### Task 5.2: Critical Unit Tests
**Priority:** HIGH  
**Time:** 4 hours  
**Owner:** Backend Developer

**Tests Needed:**
```javascript
// tests/classification-engine.test.js
test('CP2000 notice is correctly identified', () => {
  const text = 'CP2000 PROPOSED CHANGES TO YOUR TAX RETURN';
  const result = classifyIRSNotice(text);
  expect(result.noticeType).toBe('CP2000');
  expect(result.confidence).toBe('high');
});

// tests/payment-webhook.test.js
test('Webhook creates database record', async () => {
  const event = createMockCheckoutEvent();
  const response = await handler(event);
  expect(response.statusCode).toBe(200);
  // Verify database record exists
});

// tests/analyze-letter.test.js
test('Letter analysis returns structured output', async () => {
  const event = createMockAnalyzeEvent();
  const response = await handler(event);
  const data = JSON.parse(response.body);
  expect(data.analysis).toBeDefined();
  expect(data.analysis.letterType).toBeDefined();
});
```

#### Task 5.3: Security Testing
**Priority:** HIGH  
**Time:** 2 hours  
**Owner:** Security

**Tests:**
1. ✅ Payment bypass attempts fail
2. ✅ File upload size limits enforced
3. ✅ Invalid file types rejected
4. ✅ SQL injection attempts fail
5. ✅ XSS attempts sanitized
6. ✅ CORS headers correct
7. ✅ Admin mode requires authentication
8. ✅ Environment variables not exposed

---

### Day 8-14: Legal Review

#### Task 6.1: Hire Attorney
**Priority:** CRITICAL  
**Time:** 1 week  
**Owner:** Legal

**Action:**
1. Find attorney specializing in:
   - Technology/SaaS
   - Tax services
   - Consumer protection
2. Request review of:
   - Terms of Service
   - Privacy Policy
   - Disclaimer
   - Marketing claims
3. Budget: $2,000-3,000

#### Task 6.2: Update Legal Documents
**Priority:** CRITICAL  
**Time:** 4 hours  
**Owner:** Legal + Developer

**Action:**
1. Implement attorney's recommendations
2. Add IRS-specific disclaimers
3. Add GDPR compliance section
4. Disclose OpenAI data sharing
5. Add "Not a substitute for professional advice" warnings

#### Task 6.3: Obtain Insurance
**Priority:** HIGH  
**Time:** 1 week  
**Owner:** Business

**Action:**
1. Get professional liability insurance quotes
2. Coverage needed: $1-2 million
3. Estimated cost: $1,000-2,000/year
4. Providers: Hiscox, CoverWallet, Next Insurance

---

### Day 15-21: Beta Testing

#### Task 7.1: Recruit Beta Users
**Priority:** HIGH  
**Time:** 2 days  
**Owner:** Marketing

**Action:**
1. Post in r/tax, r/personalfinance (offer free analysis)
2. Email friends/family with IRS letters
3. Target: 10-20 beta users
4. Collect email addresses

#### Task 7.2: Beta Test Execution
**Priority:** HIGH  
**Time:** 1 week  
**Owner:** Product

**Action:**
1. Send beta invites with instructions
2. Provide test payment link (free)
3. Monitor Sentry for errors
4. Collect feedback via survey
5. Track key metrics:
   - Upload success rate
   - Analysis completion rate
   - Response generation rate
   - Download success rate
   - User satisfaction score

#### Task 7.3: Fix Critical Bugs
**Priority:** CRITICAL  
**Time:** 3 days  
**Owner:** Development Team

**Action:**
1. Triage all bugs found
2. Fix P0 (critical) bugs immediately
3. Fix P1 (high) bugs before launch
4. Document P2 (medium) bugs for post-launch

---

## 🟡 HIGH PRIORITY (Should Complete Before Launch)

### Task 8: Secure Admin Mode
**Time:** 4 hours

**Action:**
1. Remove admin bypass from production build
2. Add IP whitelist for admin access
3. Implement proper admin authentication
4. Remove localStorage payment bypass

### Task 9: Add Rate Limiting
**Time:** 2 hours

**Action:**
```javascript
// netlify/functions/rate-limiter.js
const rateLimit = new Map();

function checkRateLimit(ip, limit = 10, window = 60000) {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < window);
  
  if (recentRequests.length >= limit) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}
```

### Task 10: Performance Optimization
**Time:** 3 hours

**Action:**
1. Add caching headers for static assets
2. Optimize image sizes
3. Minify JavaScript
4. Enable Netlify's automatic optimization

---

## 🟢 NICE TO HAVE (Can Launch Without)

### Task 11: Email Confirmations
**Time:** 3 hours

**Action:**
1. Set up SendGrid templates
2. Send email on payment success
3. Send email on analysis complete
4. Include PDF attachment

### Task 12: Admin Dashboard
**Time:** 8 hours

**Action:**
1. Create admin.html page
2. Show recent letters
3. Show revenue stats
4. Show error rates
5. Show user feedback

### Task 13: A/B Testing Setup
**Time:** 2 hours

**Action:**
1. Set up Google Optimize
2. Create pricing test ($19 vs. $49)
3. Create CTA test variations
4. Set up conversion tracking

---

## 📅 LAUNCH TIMELINE

### Week 1 (Days 1-7)
- ✅ Day 1-2: Database fix
- ✅ Day 2-3: Payment flow
- ✅ Day 3-4: Production setup
- ✅ Day 4-5: Error tracking
- ✅ Day 5-7: Testing

### Week 2 (Days 8-14)
- ✅ Day 8-14: Legal review (parallel)
- ✅ Day 8-10: Security hardening
- ✅ Day 11-14: Performance optimization

### Week 3 (Days 15-21)
- ✅ Day 15-16: Beta recruitment
- ✅ Day 17-21: Beta testing
- ✅ Day 19-21: Bug fixes

### Week 4 (Days 22-28)
- ✅ Day 22: Final checks
- ✅ Day 23: Soft launch (limited traffic)
- ✅ Day 24-25: Monitor and optimize
- ✅ Day 26: Public launch
- ✅ Day 27-28: Scale marketing

---

## ✅ LAUNCH CHECKLIST

### Pre-Launch
- [ ] Database schema complete
- [ ] Payment flow working end-to-end
- [ ] All environment variables set
- [ ] Error tracking active
- [ ] Monitoring set up
- [ ] Legal documents reviewed
- [ ] Insurance obtained
- [ ] Beta testing complete
- [ ] Critical bugs fixed
- [ ] Security audit passed

### Launch Day
- [ ] Deploy to production
- [ ] Verify all functions work
- [ ] Test complete user journey
- [ ] Monitor error rates
- [ ] Check payment processing
- [ ] Verify email notifications
- [ ] Post launch announcement

### Post-Launch (Week 1)
- [ ] Monitor Sentry daily
- [ ] Track conversion rates
- [ ] Collect user feedback
- [ ] Fix any bugs discovered
- [ ] Optimize based on data
- [ ] Scale marketing budget

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- Error rate: < 1%
- Uptime: > 99.5%
- Page load time: < 2 seconds
- Payment success rate: > 95%
- Analysis completion rate: > 90%

### Business Metrics
- Break-even: 57 customers/month
- Target Month 1: 100 customers
- Target Month 3: 300 customers
- Target Month 6: 500 customers
- Customer satisfaction: > 4.5/5

---

## 📞 ESCALATION PATH

### If Critical Bug Found
1. Stop marketing immediately
2. Notify all stakeholders
3. Assess impact and severity
4. Fix bug in emergency patch
5. Test thoroughly
6. Deploy fix
7. Resume marketing

### If Legal Issue Arises
1. Consult attorney immediately
2. Add additional disclaimers
3. Update terms if needed
4. Notify affected users
5. Document resolution

### If Payment Issues
1. Contact Stripe support
2. Verify webhook configuration
3. Check database records
4. Manually verify payments
5. Issue refunds if needed

---

## 💰 BUDGET SUMMARY

### One-Time Costs
- Legal review: $2,000-3,000
- Insurance (first year): $1,000-2,000
- Development time: $0 (in-house)
- **Total:** $3,000-5,000

### Monthly Costs
- Sentry: $26/month (Team plan)
- UptimeRobot: $0 (free tier)
- Netlify: $0 (free tier)
- Supabase: $0 (free tier)
- Marketing: $1,000-2,000/month
- **Total:** $1,026-2,026/month

### Break-Even
- 57 customers/month at $19 = $1,083/month
- Covers monthly costs
- Achievable in Month 1

---

## 🚀 READY TO LAUNCH WHEN...

✅ All critical path tasks complete  
✅ Legal review done  
✅ Beta testing successful  
✅ No P0 bugs remaining  
✅ Monitoring and alerting active  
✅ Team trained on support procedures  
✅ Marketing materials ready  
✅ Launch announcement prepared

**Estimated Launch Date:** 3 weeks from today

---

**Document Owner:** Product Manager  
**Last Updated:** February 24, 2026  
**Status:** ACTIVE - In Progress

**Next Review:** Weekly until launch
