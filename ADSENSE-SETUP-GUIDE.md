# Tax Letter Help - Google AdSense Setup Guide

**Version:** 1.0.0  
**Date:** January 15, 2026  
**Status:** Ready for AdSense Integration

---

## Overview

This guide walks through setting up Google AdSense for Tax Letter Help's native ad system.

**Current Status:** Ad containers ready, AdSense code integrated, awaiting configuration.

---

## Step 1: Create Google AdSense Account

### 1.1 Sign Up

1. Go to [https://www.google.com/adsense](https://www.google.com/adsense)
2. Click "Get Started"
3. Sign in with Google account
4. Enter website URL: `https://taxletterhelp.pro`
5. Accept terms and conditions

### 1.2 Verify Domain Ownership

Google will provide a verification code. Add it to your site:

**Option A: HTML Tag (Recommended)**
```html
<head>
  <meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX">
</head>
```

**Option B: DNS Verification**
Add TXT record to DNS:
```
google-site-verification: google[verification-code].html
```

### 1.3 Wait for Approval

- Initial review: 1-3 days
- Full approval: 1-2 weeks
- You'll receive email notification

---

## Step 2: Get Your Publisher ID

Once approved:

1. Log into AdSense dashboard
2. Go to **Account** → **Account Information**
3. Copy your **Publisher ID**: `ca-pub-XXXXXXXXXXXXXXXX`

**Example:** `ca-pub-1234567890123456`

---

## Step 3: Create Ad Units

### 3.1 Post-Content Ad Unit (Primary)

1. Go to **Ads** → **By ad unit** → **Display ads**
2. Click **New ad unit**
3. Configure:
   - **Name:** `TLH Post-Content Native`
   - **Type:** Display ads
   - **Size:** Responsive
   - **Ad type:** Text & display ads
4. Click **Create**
5. Copy the **Ad unit ID** (data-ad-slot): `XXXXXXXXXX`

### 3.2 Exit Grid Ad Unit (Desktop)

1. Create new ad unit
2. Configure:
   - **Name:** `TLH Exit Grid Desktop`
   - **Type:** Display ads
   - **Size:** Responsive
   - **Ad type:** Text & display ads
3. Click **Create**
4. Copy the **Ad unit ID**: `XXXXXXXXXX`

### 3.3 Mobile Footer Ad Unit (Mobile)

1. Create new ad unit
2. Configure:
   - **Name:** `TLH Mobile Footer Sticky`
   - **Type:** Display ads
   - **Size:** Responsive
   - **Ad type:** Text & display ads
3. Click **Create**
4. Copy the **Ad unit ID**: `XXXXXXXXXX`

---

## Step 4: Configure Ad Settings

### 4.1 Block Sensitive Categories

Go to **Blocking controls** → **Sensitive categories**

**Block these categories:**
- [ ] Gambling & Games
- [ ] Dating
- [ ] Get Rich Quick
- [ ] Weight Loss
- [ ] Cosmetic Procedures & Body Modification
- [ ] Miracle Cures
- [ ] Cryptocurrency

**Allow these categories:**
- [x] Legal Services
- [x] Tax Services
- [x] Insurance
- [x] Credit & Lending
- [x] Debt Relief
- [x] Financial Services
- [x] Professional Services

### 4.2 Ad Review Center

Go to **Blocking controls** → **Ad review center**

- Enable **Ad review center**
- Set to **Review ads before they show**
- Review and approve relevant ads
- Block irrelevant or low-quality ads

### 4.3 Auto Ads (DISABLE)

Go to **Ads** → **Auto ads**

**CRITICAL:** Turn OFF auto ads completely
- [ ] **Auto ads:** OFF

**Why:** We use manual ad placements only to maintain conversion safety.

### 4.4 Ad Balance

Go to **Optimization** → **Ad balance**

- Set to **Show more ads** (maximize fill rate)
- Monitor performance weekly

---

## Step 5: Update Ad System Configuration

### 5.1 Edit `/src/utils/ad-system.js`

Replace placeholder values with your real AdSense IDs:

```javascript
// REPLACE WITH YOUR ADSENSE CLIENT ID
CLIENT_ID: 'ca-pub-1234567890123456', // Your actual publisher ID

// REPLACE WITH YOUR AD SLOT IDS
AD_SLOTS: {
  POST_CONTENT: '1234567890',  // Post-content ad slot ID
  EXIT_GRID: '0987654321',     // Exit grid ad slot ID
  MOBILE_FOOTER: '1122334455'  // Mobile footer ad slot ID
},
```

### 5.2 Verify Configuration

Check these values are updated:
- [x] `CLIENT_ID` - Your publisher ID
- [x] `AD_SLOTS.POST_CONTENT` - Post-content slot ID
- [x] `AD_SLOTS.EXIT_GRID` - Exit grid slot ID
- [x] `AD_SLOTS.MOBILE_FOOTER` - Mobile footer slot ID

---

## Step 6: Test Ad Integration

### 6.1 Test on Staging

1. Deploy to staging environment
2. Open browser DevTools (F12)
3. Go to Console tab
4. Visit a content page (e.g., `irs-cp2000-letter-help.html`)

**Expected console output:**
```
Initializing ad system with Google AdSense...
AdSense script loaded successfully
Loading post-content ad...
Post-content ad initialized
Ad system initialized successfully
```

### 6.2 Verify Ad Loading

**Desktop:**
- [ ] Post-content ad appears after scrolling
- [ ] Exit grid ad appears after 80% scroll
- [ ] No mobile footer ad
- [ ] No console errors

**Mobile:**
- [ ] Post-content ad appears after scrolling
- [ ] Mobile footer ad appears after 50% scroll OR 10s
- [ ] No exit grid ad
- [ ] No console errors

### 6.3 Verify Exclusions

Test these pages - ads should NOT appear:
- [ ] `/checkout` - No ads
- [ ] `/payment` - No ads
- [ ] `/login` - No ads
- [ ] `/signup` - No ads
- [ ] `/dashboard` - No ads
- [ ] `/upload` - No ads

---

## Step 7: Deploy to Production

### 7.1 Pre-Deployment Checklist

- [x] AdSense account approved
- [x] Publisher ID obtained
- [x] 3 ad units created
- [x] Sensitive categories blocked
- [x] Auto ads disabled
- [x] Configuration updated in code
- [x] Staging tests passed
- [ ] Ready for production deployment

### 7.2 Deploy

1. Commit changes to git
2. Push to production
3. Verify deployment successful

### 7.3 Post-Deployment Verification

**Within 1 hour:**
- [ ] Visit 5-10 random content pages
- [ ] Verify ads loading on desktop
- [ ] Verify ads loading on mobile
- [ ] Check console for errors
- [ ] Verify no ads on excluded pages

**Within 24 hours:**
- [ ] Check AdSense dashboard for impressions
- [ ] Verify revenue tracking working
- [ ] Monitor page speed (should be <3s)
- [ ] Check for user complaints

---

## Step 8: Configure AdSense Settings (Advanced)

### 8.1 Site Settings

Go to **Sites** → Select `taxletterhelp.pro`

**Configure:**
- [x] **Ads.txt:** Add to root directory (see below)
- [x] **Privacy & messaging:** Configure consent management
- [x] **Review center:** Enable for quality control

### 8.2 Create ads.txt File

Create `/ads.txt` in your site root:

```
# Tax Letter Help - Ads.txt
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Replace `pub-XXXXXXXXXXXXXXXX` with your actual publisher ID.

**Deploy ads.txt:**
1. Create file at `/ads.txt`
2. Deploy to production
3. Verify accessible at: `https://taxletterhelp.pro/ads.txt`

### 8.3 Privacy & Consent

**For GDPR/CCPA Compliance:**

1. Go to **Privacy & messaging**
2. Enable **Consent Management Platform**
3. Configure:
   - Show consent message in EU
   - Show privacy options in California
   - Link to privacy policy: `/privacy.html`

**Update Privacy Policy:**

Add to `/privacy.html`:
```
We use Google AdSense to display advertisements. Google uses cookies 
to serve ads based on your prior visits to our website or other websites. 
You may opt out of personalized advertising by visiting 
https://www.google.com/settings/ads
```

---

## Step 9: Monitor Performance

### 9.1 AdSense Dashboard Metrics

**Daily (First Week):**
- [ ] Impressions (should be >0)
- [ ] Page RPM (target >$2)
- [ ] Click-through rate (target >0.5%)
- [ ] Estimated earnings

**Weekly:**
- [ ] Total impressions
- [ ] Average RPM
- [ ] Top performing pages
- [ ] Blocked ads review

### 9.2 Google Analytics

**Monitor:**
- Bounce rate (should not increase >10%)
- Time on page (should not decrease >10%)
- Conversion rate (should remain stable ±5%)
- Page load time (should remain <3s)

### 9.3 Key Performance Indicators

**Week 1 Targets:**
- Impressions: >1,000
- Page RPM: >$2.00
- CTR: >0.5%
- Conversion rate: Stable

**Month 1 Targets:**
- Impressions: >10,000
- Page RPM: >$3.00
- CTR: >0.8%
- Total revenue: >$100

---

## Step 10: Optimization

### 10.1 A/B Testing

**Test these variables:**
1. Ad placement (before vs after FAQs)
2. Ad labels ("Sponsored Resources" vs "Related Services")
3. Exit grid scroll threshold (75% vs 80% vs 85%)
4. Mobile footer timing (10s vs 15s vs 20s)

### 10.2 Ad Balance

Go to **Optimization** → **Ad balance**

- Start at 100% (show all ads)
- Monitor for 2 weeks
- Adjust if RPM drops significantly

### 10.3 Blocking Controls

**Monthly Review:**
1. Go to **Blocking controls** → **Ad review center**
2. Review new ads
3. Block low-quality or irrelevant ads
4. Approve high-quality, relevant ads

---

## Troubleshooting

### Ads Not Showing

**Check:**
1. AdSense account approved?
2. Publisher ID correct in code?
3. Ad slot IDs correct in code?
4. Page not in exclusion list?
5. Browser console for errors?
6. Ad blocker disabled?

**Common Issues:**
- **"adsbygoogle.push() error"** - Script not loaded yet
- **"No fill"** - Low traffic or new account
- **"Policy violation"** - Check AdSense policy center

### Low RPM

**Optimize:**
1. Enable all relevant ad categories
2. Increase ad density (within limits)
3. Improve content quality
4. Target higher-value keywords
5. Enable responsive ads

### High Bounce Rate

**If bounce rate increases >10%:**
1. Reduce ad density
2. Move ads lower on page
3. Improve ad relevance
4. Check page load speed

---

## Configuration Reference

### Current Ad System Settings

```javascript
// Master toggle
const ADS_ENABLED = true;

// AdSense configuration
const AD_CONFIG = {
  ENABLED: true,
  PROVIDER: 'adsense',
  CLIENT_ID: 'ca-pub-XXXXXXXXXXXXXXXX', // TODO: Replace
  AD_SLOTS: {
    POST_CONTENT: 'XXXXXXXXXX',  // TODO: Replace
    EXIT_GRID: 'XXXXXXXXXX',     // TODO: Replace
    MOBILE_FOOTER: 'XXXXXXXXXX'  // TODO: Replace
  },
  MAX_DESKTOP_ADS: 3,
  MAX_MOBILE_ADS: 2,
  SCROLL_THRESHOLD_EXIT: 0.80,
  SCROLL_THRESHOLD_MOBILE: 0.50,
  MOBILE_FOOTER_DELAY: 10000,
  EXCLUDED_PAGES: [
    '/checkout', '/payment', '/login', '/signup',
    '/dashboard', '/upload', '/admin',
    '/cancel', '/success', '/thank-you'
  ]
};
```

### Emergency Disable

**Option 1: Feature Flag**
```javascript
const ADS_ENABLED = false; // Disable all ads
```

**Option 2: AdSense Dashboard**
1. Go to **Sites** → Select site
2. Click **Pause ads on this site**

---

## Success Criteria

### Technical Success
✅ Ads load on all content pages  
✅ No ads on excluded pages  
✅ No console errors  
✅ Page load time <3s  
✅ Mobile experience smooth  

### Business Success
✅ Impressions >1,000/week  
✅ RPM >$2 (baseline)  
✅ Conversion rate stable  
✅ User complaints <1%  

### User Experience Success
✅ Ads clearly labeled  
✅ Ads don't interfere with content  
✅ Mobile footer dismissible  
✅ No layout shift  

---

## Support Resources

### Google AdSense Help
- **Help Center:** https://support.google.com/adsense
- **Community:** https://support.google.com/adsense/community
- **Policy Center:** https://support.google.com/adsense/answer/48182

### Tax Letter Help Documentation
- `/AD-INTEGRATION-GUIDE.md` - Integration guide
- `/AD-SYSTEM-README.md` - Quick reference
- `/AD-DEPLOYMENT-CHECKLIST.md` - Deployment steps

### Contact
- **AdSense Support:** Via dashboard
- **Technical Issues:** Check console logs

---

## Quick Start Checklist

- [ ] Create AdSense account
- [ ] Verify domain ownership
- [ ] Wait for approval (1-2 weeks)
- [ ] Get publisher ID
- [ ] Create 3 ad units
- [ ] Block sensitive categories
- [ ] Disable auto ads
- [ ] Update configuration in code
- [ ] Create ads.txt file
- [ ] Test on staging
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Optimize based on data

---

**Status:** Ready for AdSense Integration  
**Next Step:** Create AdSense account and obtain publisher ID  
**Estimated Time:** 1-2 weeks (including approval wait)

---

**Last Updated:** January 15, 2026  
**Version:** 1.0.0  
**Prepared by:** Development Team
