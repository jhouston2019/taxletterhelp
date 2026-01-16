# Tax Letter Help - Ad System Quick Reference Card

**Version:** 1.0.0 | **Status:** Production Ready | **Date:** Jan 15, 2026

---

## 🚀 Quick Start (Copy-Paste)

### 1. Add to `<head>`:
```html
<link rel="stylesheet" href="/src/styles/ad-system.css">
```

### 2. Add after main content:
```html
<section class="native-ad post-content-ad">
  <p class="ad-label">Sponsored Resources</p>
  <div id="ad-post-content"></div>
</section>
```

### 3. Add before `</body>`:
```html
<section class="native-ad exit-grid-ad desktop-only">
  <p class="ad-label">Additional Options You May Consider</p>
  <div id="ad-exit-grid"></div>
</section>

<div class="native-ad mobile-footer-ad mobile-only">
  <button class="ad-close" aria-label="Close ad">×</button>
  <div id="ad-mobile-footer"></div>
</div>

<script type="module" src="/src/utils/ad-system.js"></script>
```

---

## 📱 Device Rules

| Device  | Post-Content | Exit Grid | Mobile Footer |
|---------|--------------|-----------|---------------|
| Desktop | ✓            | ✓         | ✗             |
| Mobile  | ✓            | ✗         | ✓             |
| Tablet  | ✓            | ✓         | ✗             |

**Breakpoint:** Mobile ≤768px

---

## 🚫 Excluded Pages (Auto-Disabled)

`/checkout` `/payment` `/login` `/signup` `/dashboard` `/upload` `/admin` `/cancel` `/success` `/thank-you`

---

## 🎯 Ad Unit Specs

### Post-Content (Primary)
- **Where:** After main content, before FAQs
- **Trigger:** Lazy-load on scroll
- **Devices:** All
- **Container:** `#ad-post-content`

### Exit Grid (Desktop)
- **Where:** After footer
- **Trigger:** 80% scroll depth
- **Devices:** Desktop + Tablet
- **Container:** `#ad-exit-grid`

### Mobile Footer (Mobile)
- **Where:** Fixed footer
- **Trigger:** 50% scroll OR 10s
- **Devices:** Mobile only
- **Container:** `#ad-mobile-footer`
- **Features:** Dismissible, session-aware

---

## ⚙️ Configuration

### Disable All Ads
```javascript
// In /src/utils/ad-system.js
const AD_CONFIG = { ENABLED: false };
```

### Runtime Control
```javascript
import { disableAds, enableAds } from '/src/utils/ad-system.js';
disableAds(); // Turn off
enableAds();  // Turn on
```

---

## 🔌 Ad Network Integration

Update these functions in `/src/utils/ad-system.js`:
- `loadPostContentAd(container)`
- `loadExitGridAd(container)`
- `loadMobileFooterAd(container)`

**Example:** See `/AD-INTEGRATION-GUIDE.md` for Google AdSense code

---

## ✅ Testing Checklist

**Desktop:**
- [ ] Post-content + exit grid visible
- [ ] No mobile footer
- [ ] Max 2 ads

**Mobile:**
- [ ] Post-content + footer visible
- [ ] No exit grid
- [ ] Footer dismissible
- [ ] Max 2 ads

**All:**
- [ ] No ads on excluded pages
- [ ] No console errors
- [ ] Ads don't block CTAs

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `/AD-SYSTEM-README.md` | Quick reference |
| `/AD-INTEGRATION-GUIDE.md` | Full integration guide |
| `/AD-SYSTEM-IMPLEMENTATION-SUMMARY.md` | Technical details |
| `/AD-DEPLOYMENT-CHECKLIST.md` | Deployment steps |
| `/ad-template.html` | Copy-paste template |
| `/AD-SYSTEM-COMPLETE.md` | Final summary |

---

## 🆘 Troubleshooting

**Ads not showing?**
1. Check console for errors
2. Verify `AD_CONFIG.ENABLED = true`
3. Confirm page not excluded
4. Check device detection

**Mobile footer not dismissing?**
1. Check session storage enabled
2. Verify close button event
3. Check for JS errors

**Layout issues?**
1. Verify CSS loaded
2. Check for conflicts
3. Test different browsers

---

## 📊 Files

**Code:**
- `/src/utils/ad-system.js` (280 lines)
- `/src/styles/ad-system.css` (350 lines)

**Docs:**
- 6 markdown files (~3,630 lines)
- 1 HTML template

**Examples:**
- `irs-cp2000-letter-help.html` ✅
- `irs-letter-help.html` ✅

---

## 🎯 Success Metrics

**Revenue:**
- RPM > $2 (baseline)
- RPM > $3 (optimized)

**UX:**
- Bounce rate stable (±10%)
- Conversion rate stable (±5%)

**Tech:**
- Page load < 3s
- Ad viewability > 70%
- Console errors = 0

---

## 📞 Quick Links

- **Template:** `/ad-template.html`
- **Full Guide:** `/AD-INTEGRATION-GUIDE.md`
- **Deployment:** `/AD-DEPLOYMENT-CHECKLIST.md`

---

**Status:** ✅ Production Ready  
**Next:** Integrate ad network → Roll out to remaining pages
