# PRICING & POSITIONING UPDATE CHECKLIST

## OBJECTIVE
Update all references from $49 to $79 and remove "AI-powered" language across the entire site.

---

## FILES REQUIRING UPDATES

### ✅ COMPLETED

1. **pricing.html** ✅
   - Updated price to $79
   - Changed header to "IRS Notice Response Preparation"
   - Added differentiation section
   - Updated CTA to "Prepare My IRS Response"
   - Removed "AI-powered" language

2. **create-checkout-session.js** ✅
   - Added Stripe metadata fields
   - Configured for $79 price point

3. **STRIPE-PRODUCT-UPDATE-GUIDE.md** ✅
   - Created comprehensive guide for Stripe configuration

---

### ⏳ PENDING UPDATES

#### HIGH PRIORITY (Customer-Facing)

4. **index.html** - Homepage
   - [ ] Line 9: Remove "AI-powered" from meta description
   - [ ] Line 13: Remove "AI-powered" from OG description
   - [ ] Line 19: Remove "AI-powered" from Twitter description
   - [ ] Line 34: Remove "AI-powered" from schema description
   - [ ] Line 58: Update CTA from "$49" to "$79"
   - [ ] Line 140: Update "one-time payment of $49" to "$79"
   - [ ] Line 254: Update table cell "$49" to "$79"
   - [ ] Line 271: Remove "Choose Your Plan" header
   - [ ] Line 272: Remove "AI-powered" and update "$49" to "$79"
   - [ ] Line 276: Update "$49" to "$79"
   - [ ] Line 279: Remove "AI-powered analysis"

5. **payment.html** - Payment Page
   - [ ] Line 24: Remove "AI-powered"
   - [ ] Line 35: Update "$49" to "$79"
   - [ ] Line 39: Remove "AI-powered"

6. **success.html** - Thank You Page
   - [ ] Line 31: Remove "AI-powered"
   - [ ] Line 36: Remove "AI-powered"

#### MEDIUM PRIORITY (SEO/Meta)

7. **upload.html**
   - [ ] Line 7: Remove "AI-generated" from meta description

8. **privacy.html**
   - [ ] Line 8: Remove "AI-generated" from meta description
   - [ ] Line 11: Remove "AI-generated" from OG description
   - [ ] Line 44: Remove "AI-powered"

9. **signup.html**
   - [ ] Line 7: Remove "AI-powered" from meta description
   - [ ] Line 10: Remove "AI-powered" from OG description

10. **terms.html**
    - [ ] Line 8: Remove "AI-powered" from meta description
    - [ ] Line 11: Remove "AI-powered" from OG description
    - [ ] Line 35: Remove "AI-powered"

11. **disclaimer.html**
    - [ ] Line 47: Remove "AI-generated"

#### LOW PRIORITY (Images/Assets)

12. **images/og-image-generator.html**
    - [ ] Line 71: Update "Simple $49 Flat Fee" to "$79"

---

## REPLACEMENT GUIDELINES

### Price Updates
- **Old**: "$49"
- **New**: "$79"
- **Context**: "one-time, per IRS notice"

### Language Replacements

| Remove | Replace With |
|--------|-------------|
| "AI-powered" | "Procedural, risk-aware" OR "Notice-specific" |
| "AI-generated" | "Procedurally prepared" OR "System-generated" |
| "AI assistant" | "Response preparation system" |
| "Choose Your Plan" | "IRS Notice Response Preparation" |
| "Get My IRS Response Letter - $49" | "Prepare My IRS Response - $79" |

### Meta Description Template
**Old**:
```
Upload your IRS letter and get an instant AI-powered explanation and response.
```

**New**:
```
Upload your IRS notice and get notice-specific, risk-aware response preparation with procedural rules and evidence guidance.
```

---

## AUTOMATED FIND & REPLACE

### Step 1: Price Updates
```bash
# Find all $49 references
grep -r "\$49" --include="*.html" .

# Replace with $79 (manual verification recommended)
```

### Step 2: AI Language Removal
```bash
# Find all AI-powered references
grep -ri "AI-powered" --include="*.html" .

# Find all AI-generated references
grep -ri "AI-generated" --include="*.html" .

# Find all AI assistant references
grep -ri "AI assistant" --include="*.html" .
```

---

## VERIFICATION CHECKLIST

After updates, verify:

### Price Consistency
- [ ] All pages show $79 (not $49)
- [ ] No mixed pricing exists
- [ ] Stripe checkout shows $79
- [ ] Payment confirmation shows $79

### Language Consistency
- [ ] No "AI-powered" language remains
- [ ] No "AI-generated" language remains
- [ ] No "AI assistant" language remains
- [ ] No "Choose Your Plan" headers exist
- [ ] All CTAs use "Prepare" not "Get" or "Generate"

### Positioning Consistency
- [ ] Product described as "procedural" or "risk-aware"
- [ ] System described as "notice-specific"
- [ ] No chat-style language exists
- [ ] Differentiation from chatbots is clear

### SEO/Meta
- [ ] All meta descriptions updated
- [ ] All OG descriptions updated
- [ ] All Twitter descriptions updated
- [ ] Schema markup updated

---

## TESTING CHECKLIST

### Functional Testing
- [ ] Homepage loads correctly
- [ ] Pricing page loads correctly
- [ ] Payment flow works end-to-end
- [ ] Stripe checkout shows correct price
- [ ] Thank you page displays correctly
- [ ] All CTAs link to correct pages

### Visual Testing
- [ ] No broken layouts
- [ ] All images load
- [ ] Mobile responsive
- [ ] Desktop responsive

### Content Testing
- [ ] No $49 references visible
- [ ] No "AI-powered" text visible
- [ ] Positioning is consistent
- [ ] CTAs are clear and directive

---

## DEPLOYMENT PLAN

### Phase 1: Critical Pages (30 minutes)
1. Update index.html (homepage)
2. Update payment.html
3. Update success.html
4. Deploy to production
5. Test checkout flow

### Phase 2: SEO/Meta (15 minutes)
1. Update upload.html
2. Update privacy.html
3. Update signup.html
4. Update terms.html
5. Update disclaimer.html
6. Deploy to production

### Phase 3: Assets (10 minutes)
1. Update og-image-generator.html
2. Generate new OG images if needed
3. Deploy to production

### Phase 4: Verification (15 minutes)
1. Run full site audit
2. Test all pages
3. Verify Stripe integration
4. Check mobile responsiveness

---

## ROLLBACK PLAN

If issues arise:

### Quick Rollback
```bash
git revert HEAD
git push origin main
```

### Partial Rollback
```bash
# Revert specific file
git checkout HEAD~1 -- index.html
git commit -m "Revert index.html changes"
git push origin main
```

---

## POST-DEPLOYMENT MONITORING

### First Hour
- Monitor Stripe dashboard for checkouts
- Check for any error reports
- Verify pricing displays correctly
- Test checkout flow manually

### First 24 Hours
- Monitor conversion rate
- Check for customer confusion
- Verify no broken links
- Monitor error logs

### First Week
- Analyze conversion rate at $79
- Gather customer feedback
- Monitor for any issues
- Adjust messaging if needed

---

## CUSTOMER COMMUNICATION

### Email to Existing Customers (Optional)
```
Subject: TaxLetterHelp System Upgrade

We've upgraded TaxLetterHelp from a generic AI tool to a procedural 
IRS response engine with:

- Deterministic notice classification
- Notice-specific procedural rules
- Risk guardrails that block dangerous admissions
- Evidence mapping with explicit guidance
- Deadline intelligence and escalation timelines

The new price is $79 per notice (previously $49). This reflects the 
materially better outcomes and safety controls now included.

Thank you for your continued trust.
```

### FAQ Update
Add to FAQ:
- Why did the price change?
- What's different about the new system?
- Is this still better than ChatGPT?
- Do I need to pay $79 for each notice?

---

## SUCCESS CRITERIA

### Pricing
- ✅ All pages show $79 consistently
- ✅ Stripe checkout works at $79
- ✅ No $49 references remain

### Positioning
- ✅ No "AI-powered" language exists
- ✅ Product positioned as "procedural system"
- ✅ Differentiation from chatbots is clear
- ✅ CTAs use directive language

### Functionality
- ✅ Checkout flow works end-to-end
- ✅ Metadata captured in Stripe
- ✅ No broken links or layouts
- ✅ Mobile and desktop responsive

---

**Status**: Checklist Created  
**Next Action**: Execute updates to index.html, payment.html, and success.html  
**Priority**: HIGH  
**Estimated Time**: 1-2 hours total

