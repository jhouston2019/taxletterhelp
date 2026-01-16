# Tax Letter Help - AdSense Configuration Summary

**Date:** January 15, 2026  
**Status:** ✅ Code Ready - Awaiting AdSense Account Setup

---

## What's Complete

### ✅ Ad System Integration

**File:** `/src/utils/ad-system.js`

The ad system is now fully wired with Google AdSense:

1. **AdSense Script Loading**
   - Loads once per page
   - Async, deferred
   - Includes crossorigin attribute
   - Error handling included

2. **Three Ad Units Configured**
   - Post-content native ad (responsive)
   - Exit grid ad (desktop only, lazy-loaded)
   - Mobile footer sticky (mobile only, dismissible)

3. **Safety Features**
   - Page exclusions (checkout, login, etc.)
   - Device detection (desktop/mobile/tablet)
   - Lazy loading (performance optimized)
   - Session management (mobile footer)
   - Feature flags (emergency disable)

---

## Configuration Required

### Step 1: Get AdSense Publisher ID

**Action Required:**
1. Create Google AdSense account
2. Verify domain ownership
3. Wait for approval (1-2 weeks)
4. Get your Publisher ID: `ca-pub-XXXXXXXXXXXXXXXX`

### Step 2: Create Ad Units

**Create 3 ad units in AdSense dashboard:**

1. **Post-Content Ad**
   - Name: `TLH Post-Content Native`
   - Type: Display ads
   - Size: Responsive
   - Get slot ID: `XXXXXXXXXX`

2. **Exit Grid Ad**
   - Name: `TLH Exit Grid Desktop`
   - Type: Display ads
   - Size: Responsive
   - Get slot ID: `XXXXXXXXXX`

3. **Mobile Footer Ad**
   - Name: `TLH Mobile Footer Sticky`
   - Type: Display ads
   - Size: Responsive
   - Get slot ID: `XXXXXXXXXX`

### Step 3: Update Configuration

**Edit:** `/src/utils/ad-system.js`

**Replace these lines (around line 25-35):**

```javascript
// BEFORE (placeholder values):
CLIENT_ID: 'ca-pub-XXXXXXXXXXXXXXXX', // TODO: Replace with real AdSense client ID

AD_SLOTS: {
  POST_CONTENT: 'XXXXXXXXXX', // TODO: Replace with post-content ad slot ID
  EXIT_GRID: 'XXXXXXXXXX',     // TODO: Replace with exit grid ad slot ID
  MOBILE_FOOTER: 'XXXXXXXXXX'  // TODO: Replace with mobile footer ad slot ID
},
```

```javascript
// AFTER (your actual values):
CLIENT_ID: 'ca-pub-1234567890123456', // Your real publisher ID

AD_SLOTS: {
  POST_CONTENT: '1234567890',  // Your post-content slot ID
  EXIT_GRID: '0987654321',     // Your exit grid slot ID
  MOBILE_FOOTER: '1122334455'  // Your mobile footer slot ID
},
```

### Step 4: Update ads.txt

**Edit:** `/ads.txt`

**Replace:**
```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

**With:**
```
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
```

(Use your actual publisher ID)

---

## AdSense Dashboard Settings

### Required Settings

**1. Block Sensitive Categories**

Go to: **Blocking controls** → **Sensitive categories**

Block:
- [ ] Gambling & Games
- [ ] Dating
- [ ] Get Rich Quick
- [ ] Weight Loss
- [ ] Cosmetic Procedures
- [ ] Cryptocurrency

Allow:
- [x] Legal Services
- [x] Tax Services
- [x] Insurance
- [x] Financial Services

**2. Disable Auto Ads**

Go to: **Ads** → **Auto ads**

- [ ] **Auto ads:** OFF (CRITICAL)

**Why:** We use manual placements only for conversion safety.

**3. Enable Ad Review Center**

Go to: **Blocking controls** → **Ad review center**

- [x] Enable ad review
- [x] Review ads before showing

---

## Testing Checklist

### After Configuration

**1. Test on Staging**

Console should show:
```
Initializing ad system with Google AdSense...
AdSense script loaded successfully
Loading post-content ad...
Post-content ad initialized
Ad system initialized successfully
```

**2. Verify Ad Loading**

Desktop:
- [ ] Post-content ad loads
- [ ] Exit grid ad loads after 80% scroll
- [ ] No mobile footer

Mobile:
- [ ] Post-content ad loads
- [ ] Mobile footer loads after 50% scroll OR 10s
- [ ] No exit grid

**3. Verify Exclusions**

No ads on:
- [ ] `/checkout`
- [ ] `/payment`
- [ ] `/login`
- [ ] `/dashboard`
- [ ] `/upload`

---

## Code Changes Summary

### Modified Files

**1. `/src/utils/ad-system.js`**

**Added:**
- `ADS_ENABLED` global toggle
- `AD_CONFIG.CLIENT_ID` for publisher ID
- `AD_CONFIG.AD_SLOTS` for ad unit IDs
- `loadAdSenseScript()` function
- AdSense integration in all 3 ad loaders
- Async initialization with error handling

**Changes:**
- `loadPostContentAd()` - Now loads real AdSense ads
- `loadExitGridAd()` - Now loads real AdSense ads
- `loadMobileFooterAd()` - Now loads real AdSense ads
- `initAdSystem()` - Now async, loads AdSense script first

**2. `/ads.txt` (New File)**

- Declares authorized ad sellers
- Must be deployed to site root
- Must be updated with real publisher ID

**3. `/ADSENSE-SETUP-GUIDE.md` (New File)**

- Complete AdSense setup instructions
- Step-by-step configuration guide
- Troubleshooting section
- Optimization tips

---

## How It Works

### 1. Page Load

```
User visits page
  ↓
shouldShowAds() checks page path
  ↓
If excluded → No ads
If allowed → Continue
  ↓
loadAdSenseScript() loads AdSense
  ↓
Ads initialize based on device
```

### 2. Desktop Flow

```
Post-content ad → Lazy-load on scroll into view
  ↓
User scrolls to 80%
  ↓
Exit grid ad → Loads once
```

### 3. Mobile Flow

```
Post-content ad → Lazy-load on scroll into view
  ↓
User scrolls to 50% OR 10 seconds
  ↓
Mobile footer ad → Loads once, dismissible
```

---

## Feature Flags

### Emergency Disable

**Option 1: Code (Instant)**
```javascript
// In /src/utils/ad-system.js (line 16)
const ADS_ENABLED = false; // Disable all ads
```

**Option 2: AdSense Dashboard (5 minutes)**
1. Go to **Sites** → Select site
2. Click **Pause ads on this site**

### Per-Device Disable

```javascript
// Disable desktop ads only
if (window.innerWidth >= 1024) return;

// Disable mobile ads only
if (window.innerWidth < 768) return;
```

---

## Performance Impact

### Expected Metrics

**Before Ads:**
- Page load: ~2.0s
- First Contentful Paint: ~1.0s
- Largest Contentful Paint: ~2.0s

**After Ads (with lazy loading):**
- Page load: ~2.2s (+0.2s)
- First Contentful Paint: ~1.0s (no change)
- Largest Contentful Paint: ~2.2s (+0.2s)

**Why minimal impact:**
- AdSense script loads async
- Ads lazy-load when scrolled into view
- No ads above the fold

---

## Revenue Projections

### Conservative Estimate

**Assumptions:**
- 10,000 monthly visitors
- 3% conversion rate (300 buyers)
- 97% non-buyers (9,700 visitors)
- 2 ad impressions per visitor
- $2 RPM (conservative)

**Revenue:**
- Product: 300 × $97 = **$29,100**
- Ads: (19,400 / 1,000) × $2 = **$38.80**
- **Total: $29,138.80/month**

### Optimized Estimate

**Assumptions:**
- Same traffic
- $5 RPM (optimized)

**Revenue:**
- Product: **$29,100**
- Ads: (19,400 / 1,000) × $5 = **$97.00**
- **Total: $29,197.00/month**

**Ad revenue:** ~0.3% of total (stable floor)

---

## Next Steps

### Immediate (This Week)

1. ✅ **Code integration complete**
2. ⏳ **Create AdSense account**
3. ⏳ **Submit for approval**
4. ⏳ **Wait 1-2 weeks**

### After Approval

5. ⏳ **Get publisher ID**
6. ⏳ **Create 3 ad units**
7. ⏳ **Update configuration**
8. ⏳ **Deploy ads.txt**
9. ⏳ **Test on staging**
10. ⏳ **Deploy to production**

### Ongoing

11. ⏳ **Monitor metrics daily (first week)**
12. ⏳ **Optimize based on data**
13. ⏳ **A/B test placements**
14. ⏳ **Scale with traffic**

---

## Support

### Documentation

- **Setup Guide:** `/ADSENSE-SETUP-GUIDE.md`
- **Integration Guide:** `/AD-INTEGRATION-GUIDE.md`
- **Deployment Checklist:** `/AD-DEPLOYMENT-CHECKLIST.md`
- **Quick Reference:** `/AD-QUICK-REFERENCE.md`

### Code Files

- **Ad System:** `/src/utils/ad-system.js`
- **Ad Styles:** `/src/styles/ad-system.css`
- **Ads.txt:** `/ads.txt`

### Google Resources

- **AdSense Help:** https://support.google.com/adsense
- **Ads.txt Spec:** https://iabtechlab.com/ads-txt/
- **Policy Center:** https://support.google.com/adsense/answer/48182

---

## Summary

### What's Ready

✅ Ad system code complete  
✅ AdSense integration wired  
✅ Three ad units configured  
✅ Safety features implemented  
✅ Feature flags in place  
✅ Documentation complete  
✅ ads.txt template created  

### What's Needed

⏳ AdSense account approval  
⏳ Publisher ID  
⏳ Ad unit slot IDs  
⏳ Configuration update  
⏳ ads.txt deployment  

### Timeline

- **Code:** ✅ Complete (today)
- **AdSense approval:** 1-2 weeks
- **Configuration:** 15 minutes
- **Testing:** 1 hour
- **Deployment:** 30 minutes
- **Total:** ~2 weeks (mostly waiting for approval)

---

**Status:** ✅ CODE COMPLETE  
**Next Action:** Create AdSense account  
**Estimated Go-Live:** 2 weeks from account creation

---

**Last Updated:** January 15, 2026  
**Version:** 1.0.0  
**Prepared by:** Development Team
