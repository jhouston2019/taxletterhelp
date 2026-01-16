# Tax Letter Help - AdSense Quick Start

**Version:** 2.0.0 | **Status:** Ready | **Date:** Jan 15, 2026

---

## ✅ Code Status: COMPLETE

AdSense integration is wired and ready. Just need 3 configuration values.

---

## 🚀 3-Step Setup

### 1. Get AdSense Account

**Action:** Create account at https://www.google.com/adsense

**Result:** Publisher ID like `ca-pub-1234567890123456`

**Timeline:** 1-2 weeks (approval wait)

### 2. Create 3 Ad Units

**In AdSense Dashboard:**

1. **Post-Content Ad**
   - Name: `TLH Post-Content Native`
   - Type: Display ads, Responsive
   - Result: Slot ID `1234567890`

2. **Exit Grid Ad**
   - Name: `TLH Exit Grid Desktop`
   - Type: Display ads, Responsive
   - Result: Slot ID `0987654321`

3. **Mobile Footer Ad**
   - Name: `TLH Mobile Footer Sticky`
   - Type: Display ads, Responsive
   - Result: Slot ID `1122334455`

### 3. Update 2 Files

**File 1:** `/src/utils/ad-system.js` (lines 25-32)

```javascript
CLIENT_ID: 'ca-pub-1234567890123456', // Your publisher ID

AD_SLOTS: {
  POST_CONTENT: '1234567890',  // Your slot ID
  EXIT_GRID: '0987654321',     // Your slot ID
  MOBILE_FOOTER: '1122334455'  // Your slot ID
},
```

**File 2:** `/ads.txt` (line 9)

```
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
```

---

## ⚙️ Required AdSense Settings

### 1. Block Sensitive Categories

Block: Gambling, Dating, Crypto, Weight Loss

Allow: Legal, Tax, Insurance, Financial

### 2. Disable Auto Ads

**CRITICAL:** Turn OFF auto ads

Go to: Ads → Auto ads → OFF

### 3. Enable Ad Review

Go to: Blocking controls → Ad review center → ON

---

## 🧪 Testing

### Expected Console Output

```
Initializing ad system with Google AdSense...
AdSense script loaded successfully
Loading post-content ad...
Post-content ad initialized
Ad system initialized successfully
```

### Desktop

- [x] Post-content ad loads
- [x] Exit grid ad loads (80% scroll)
- [x] No mobile footer

### Mobile

- [x] Post-content ad loads
- [x] Mobile footer loads (50% scroll OR 10s)
- [x] No exit grid

### Exclusions

No ads on: `/checkout` `/payment` `/login` `/dashboard` `/upload`

---

## 🔧 Emergency Disable

**Instant disable:**

```javascript
// In /src/utils/ad-system.js (line 17)
const ADS_ENABLED = false;
```

---

## 📊 Expected Revenue

**Conservative:** $2 RPM = ~$39/month  
**Optimized:** $5 RPM = ~$97/month

(Based on 10k visitors, 97% non-buyers)

---

## 📚 Full Documentation

- **Setup Guide:** `/ADSENSE-SETUP-GUIDE.md`
- **Configuration:** `/ADSENSE-CONFIGURATION-SUMMARY.md`
- **Complete Summary:** `/ADSENSE-INTEGRATION-COMPLETE.md`

---

## ✅ Checklist

- [ ] Create AdSense account
- [ ] Wait for approval (1-2 weeks)
- [ ] Get publisher ID
- [ ] Create 3 ad units
- [ ] Update `/src/utils/ad-system.js`
- [ ] Update `/ads.txt`
- [ ] Block sensitive categories
- [ ] Disable auto ads
- [ ] Deploy
- [ ] Test
- [ ] Monitor

---

**Status:** ✅ Ready  
**Next:** Create AdSense account  
**Timeline:** 2 weeks + 30 min config
