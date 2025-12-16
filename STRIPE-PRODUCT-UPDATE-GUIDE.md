# STRIPE PRODUCT & PRICE UPDATE GUIDE

## OBJECTIVE

Update Stripe product configuration to align with the new $79 pricing and procedural positioning.

---

## STEP 1: UPDATE STRIPE PRODUCT

### Navigate to Stripe Dashboard
1. Go to https://dashboard.stripe.com
2. Navigate to **Products** → **Product Catalog**
3. Find the existing "Tax Letter Help" or "IRS Letter Response" product

### Update Product Name
```
IRS Notice Response Preparation
```

### Update Product Description
```
One-time preparation of a notice-specific IRS response using a procedural, 
risk-aware system designed to reduce over-disclosure and escalation risk.
```

### Add/Update Product Metadata

Click "Add metadata" and enter the following key-value pairs:

| Key | Value |
|-----|-------|
| `product_type` | `irs_notice_response` |
| `pricing_model` | `one_time` |
| `risk_level` | `regulated` |
| `ai_mode` | `constrained_procedural` |
| `not_chat_based` | `true` |
| `system_version` | `1.0.0` |
| `classification_engine` | `deterministic` |
| `safety_controls` | `enabled` |

**Why These Metadata Fields Matter**:
- **product_type**: Identifies this as IRS-specific (not generic tax help)
- **pricing_model**: Confirms one-time payment (not subscription)
- **risk_level**: Flags as regulated use case (not casual)
- **ai_mode**: Documents that AI is constrained by procedural rules
- **not_chat_based**: Explicitly differentiates from chatbots
- **system_version**: Tracks product evolution
- **classification_engine**: Documents deterministic classification
- **safety_controls**: Confirms risk guardrails are active

---

## STEP 2: CREATE NEW PRICE ($79)

### In the Product Page
1. Click **Add another price**
2. Set the following:

**Price**:
```
$79.00 USD
```

**Billing Period**:
```
One time
```

**Price Description** (optional but recommended):
```
Per IRS notice - procedural response preparation
```

**Price Metadata** (click "Add metadata"):

| Key | Value |
|-----|-------|
| `price_point` | `79` |
| `currency` | `usd` |
| `per_unit` | `per_notice` |
| `includes` | `classification,playbook,evidence_mapping,risk_analysis,response_letter` |
| `professional_threshold` | `recommends_pro_above_10k` |

3. Click **Add price**
4. **Copy the new price ID** (format: `price_xxxxxxxxxxxxx`)

---

## STEP 3: UPDATE ENVIRONMENT VARIABLES

### Netlify Environment Variables

1. Go to Netlify Dashboard
2. Navigate to **Site Settings** → **Environment Variables**
3. Update or add:

```
STRIPE_PRICE_RESPONSE=price_xxxxxxxxxxxxx
```

(Replace `price_xxxxxxxxxxxxx` with the actual price ID from Step 2)

### Local Development (.env file)

Update your `.env` file:

```bash
STRIPE_PRICE_RESPONSE=price_xxxxxxxxxxxxx
```

---

## STEP 4: ARCHIVE OLD PRICE (OPTIONAL)

If you have an existing $49 price:

1. Go to the old price in Stripe
2. Click **Archive this price**
3. Confirm archival

**Note**: Archiving prevents new customers from using the old price, but doesn't affect existing payments.

---

## STEP 5: VERIFY STRIPE WEBHOOK

### Check Webhook Configuration

1. Go to **Developers** → **Webhooks**
2. Verify webhook endpoint is configured:

```
https://your-site.netlify.app/.netlify/functions/stripe-webhook
```

3. Ensure these events are selected:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

---

## STEP 6: TEST THE INTEGRATION

### Test Checkout Flow

1. Go to your pricing page: `https://your-site.com/pricing.html`
2. Click "Prepare My IRS Response"
3. Verify Stripe checkout shows:
   - **Product Name**: "IRS Notice Response Preparation"
   - **Price**: $79.00
   - **Payment Type**: One-time

### Test Metadata

After a test purchase:

1. Go to Stripe Dashboard → **Payments**
2. Click on the test payment
3. Scroll to **Metadata** section
4. Verify all metadata fields are present:
   - `product_type: irs_notice_response`
   - `pricing_model: one_time`
   - `risk_level: regulated`
   - `ai_mode: constrained_procedural`
   - `not_chat_based: true`
   - `price_point: 79`

---

## STEP 7: UPDATE MARKETING MATERIALS

### Pricing Page ✅
- Already updated to $79
- Includes differentiation section
- No AI branding

### Homepage
- Update any pricing mentions from $49 to $79
- Remove "AI-powered" language
- Add "procedural, risk-aware" positioning

### Email Templates
- Update pricing in confirmation emails
- Update product description to match new positioning

### Social Media / Ads
- Update ad copy to reflect $79 pricing
- Emphasize "procedural system" not "AI tool"

---

## ACCEPTANCE CRITERIA CHECKLIST

Before going live, verify:

### Stripe Configuration
- [ ] Product name is "IRS Notice Response Preparation"
- [ ] Product description mentions "procedural, risk-aware system"
- [ ] Product metadata includes all 8 required fields
- [ ] New price is $79.00 USD one-time
- [ ] Price metadata includes all 5 required fields
- [ ] Old price is archived (if applicable)
- [ ] Webhook is configured and active

### Environment Variables
- [ ] `STRIPE_PRICE_RESPONSE` updated in Netlify
- [ ] `STRIPE_PRICE_RESPONSE` updated in local `.env`
- [ ] Environment variables deployed to production

### Website
- [ ] Pricing page shows $79
- [ ] Pricing page includes differentiation section
- [ ] No "AI-powered" or "AI assistant" language
- [ ] CTA button says "Prepare My IRS Response"
- [ ] Checkout flow works end-to-end
- [ ] Metadata appears in Stripe after purchase

### Consistency
- [ ] All pages show consistent $79 pricing
- [ ] All pages use "procedural" positioning
- [ ] No subscription language exists
- [ ] No chat-style CTAs exist

---

## ROLLBACK PLAN

If issues arise after deployment:

### Quick Rollback (5 minutes)
1. Update `STRIPE_PRICE_RESPONSE` back to old price ID
2. Redeploy Netlify site
3. Verify checkout works with old price

### Full Rollback (15 minutes)
1. Revert pricing page changes via Git
2. Update environment variables
3. Redeploy site
4. Test checkout flow

---

## MONITORING

### First 24 Hours
- Monitor Stripe dashboard for successful checkouts
- Verify metadata is being captured correctly
- Check for any webhook errors
- Monitor customer feedback

### First Week
- Track conversion rate at $79 vs. old $49 price
- Monitor for any pricing confusion
- Verify positioning resonates with customers
- Check for any technical issues

---

## PRICING RATIONALE

### Why $79 vs. $49?

**Value Delivered**:
- Deterministic notice classification (not AI guessing)
- Notice-specific procedural playbooks (14+ notice types)
- Risk guardrails (50+ dangerous patterns blocked)
- Evidence mapping (explicit attach/exclude guidance)
- Deadline intelligence (exact escalation timelines)
- Professional help thresholds (objective criteria)

**Competitive Positioning**:
- **vs. CPA**: $79 vs. $300-$600 (73-87% savings)
- **vs. ChatGPT**: $79 vs. $0 (but materially safer and more accurate)
- **vs. Tax Software**: $79 vs. $50-$200 (competitive, specialized)

**Customer Perception**:
- $49 = "Cheap AI tool"
- $79 = "Professional procedural system"

**Break-Even Analysis**:
- OpenAI API costs: ~$0.50-$2 per analysis
- Infrastructure: ~$5/month per 100 users
- Break-even: ~10 customers/month
- Target: 50-100 customers/month

---

## SUPPORT DOCUMENTATION

### Customer FAQ

**Q: Why did the price increase from $49 to $79?**

A: The system has been upgraded from a generic AI tool to a procedural IRS response engine with:
- Deterministic notice classification
- Notice-specific procedural rules
- Risk guardrails that block dangerous admissions
- Evidence mapping with explicit guidance
- Deadline intelligence and escalation timelines

This is not a price increase for the same product—it's a fundamentally different system that provides materially better outcomes.

**Q: Is this a subscription?**

A: No. $79 is a one-time payment per IRS notice. No recurring charges. No hidden fees.

**Q: What if I have multiple IRS notices?**

A: Each notice requires a separate $79 payment, as each notice requires notice-specific analysis and response preparation.

**Q: Can I get a refund?**

A: Yes, we offer a 30-day money-back guarantee if you're not satisfied with the response preparation.

---

## NEXT STEPS

1. ✅ Update Stripe product and price (Steps 1-2)
2. ✅ Update environment variables (Step 3)
3. ✅ Test checkout flow (Step 6)
4. ✅ Verify metadata (Step 6)
5. ⏳ Monitor for 24 hours (Step "Monitoring")
6. ⏳ Analyze conversion data after 1 week

---

**Status**: Ready for Implementation  
**Priority**: HIGH  
**Estimated Time**: 30 minutes  
**Risk Level**: LOW (easy rollback available)

