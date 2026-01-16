# Tax Letter Help - Native Ad System

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** January 15, 2026

---

## Quick Start

### 1. Add CSS to your page `<head>`:

```html
<link rel="stylesheet" href="/src/styles/ad-system.css">
```

### 2. Add ad containers to your page:

**Post-Content Ad** (after main content):
```html
<section class="native-ad post-content-ad">
  <p class="ad-label">Sponsored Resources</p>
  <div id="ad-post-content"></div>
</section>
```

**Exit Grid** (desktop only, before `</body>`):
```html
<section class="native-ad exit-grid-ad desktop-only">
  <p class="ad-label">Additional Options You May Consider</p>
  <div id="ad-exit-grid"></div>
</section>
```

**Mobile Footer** (mobile only, before `</body>`):
```html
<div class="native-ad mobile-footer-ad mobile-only">
  <button class="ad-close" aria-label="Close ad">×</button>
  <div id="ad-mobile-footer"></div>
</div>
```

### 3. Add JavaScript before closing `</body>`:

```html
<script type="module" src="/src/utils/ad-system.js"></script>
```

### 4. Done!

The ad system will automatically:
- Detect device type (desktop/mobile)
- Lazy-load ads when appropriate
- Respect scroll thresholds
- Exclude conversion pages
- Handle session management

---

## File Structure

```
/src/
  /utils/
    ad-system.js          # Core ad logic (280 lines)
  /styles/
    ad-system.css         # Ad styling (350 lines)

/AD-INTEGRATION-GUIDE.md  # Complete integration guide
/AD-SYSTEM-IMPLEMENTATION-SUMMARY.md  # Implementation details
/AD-SYSTEM-README.md      # This file
/ad-template.html         # Copy-paste template
```

---

## Ad Units

### 1️⃣ Post-Content Native Ad (Primary)
- **Where:** After main content, before FAQs
- **Devices:** Desktop + Mobile + Tablet
- **Trigger:** Lazy-load on scroll into view
- **Max Ads:** 1 per page

### 2️⃣ Exit Grid (Desktop Only)
- **Where:** Bottom of page, after footer
- **Devices:** Desktop + Tablet only
- **Trigger:** 80% scroll depth
- **Max Ads:** 1 per page

### 3️⃣ Mobile Footer Sticky (Mobile Only)
- **Where:** Fixed footer
- **Devices:** Mobile only (≤768px)
- **Trigger:** 50% scroll OR 10 seconds
- **Features:** Dismissible, session-aware
- **Max Ads:** 1 per page

---

## Device Rules

| Device  | Post-Content | Exit Grid | Mobile Footer | Total |
|---------|--------------|-----------|---------------|-------|
| Desktop | ✓            | ✓         | ✗             | 2     |
| Mobile  | ✓            | ✗         | ✓             | 2     |
| Tablet  | ✓            | ✓         | ✗             | 2     |

---

## Excluded Pages (Auto-Disabled)

Ads never appear on:
- `/checkout`, `/payment` (conversion)
- `/login`, `/signup` (auth)
- `/dashboard` (authenticated)
- `/upload` (product)
- `/admin` (admin)
- `/cancel`, `/success`, `/thank-you` (post-transaction)

---

## Configuration

### Global Toggle

```javascript
// In /src/utils/ad-system.js
const AD_CONFIG = {
  ENABLED: true, // Set to false to disable all ads
  // ...
};
```

### Runtime Control

```javascript
import { disableAds, enableAds } from '/src/utils/ad-system.js';

disableAds(); // Turn off ads
enableAds();  // Turn on ads
```

---

## Ad Network Integration

### Current State
Clean HTML containers ready for integration:
- `#ad-post-content`
- `#ad-exit-grid`
- `#ad-mobile-footer`

### Integration Steps

1. Choose ad network (Google AdSense, Media.net, etc.)
2. Update these functions in `/src/utils/ad-system.js`:
   - `loadPostContentAd(container)`
   - `loadExitGridAd(container)`
   - `loadMobileFooterAd(container)`

### Example: Google AdSense

```javascript
function loadPostContentAd(container) {
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX');
  ins.setAttribute('data-ad-slot', 'XXXXXXXXXX');
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');
  
  container.appendChild(ins);
  (adsbygoogle = window.adsbygoogle || []).push({});
}
```

---

## Testing

### Desktop
- [ ] Post-content ad loads
- [ ] Exit grid appears after 80% scroll
- [ ] No mobile footer
- [ ] Max 2 ads visible

### Mobile
- [ ] Post-content ad loads
- [ ] Mobile footer appears (50% scroll OR 10s)
- [ ] Footer X button dismisses ad
- [ ] No exit grid
- [ ] Max 2 ads visible

### All Devices
- [ ] No ads on excluded pages
- [ ] No console errors
- [ ] Ads don't interfere with CTAs
- [ ] Page load time acceptable

---

## Troubleshooting

### Ads not appearing?
1. Check console for errors
2. Verify `AD_CONFIG.ENABLED = true`
3. Confirm page not in excluded list
4. Check device detection

### Mobile footer not dismissing?
1. Check session storage enabled
2. Verify close button event listener
3. Check for JS errors

### Layout issues?
1. Verify CSS file loaded
2. Check for CSS conflicts
3. Test in different browsers

---

## Support

**Documentation:**
- `/AD-INTEGRATION-GUIDE.md` - Complete integration guide
- `/AD-SYSTEM-IMPLEMENTATION-SUMMARY.md` - Technical details
- `/ad-template.html` - Copy-paste template

**Files:**
- `/src/utils/ad-system.js` - Core logic
- `/src/styles/ad-system.css` - Styling

---

## Safety Features

✅ No ads above the fold  
✅ No ads near CTAs  
✅ No ads in instructions  
✅ No ads on conversion pages  
✅ Lazy-loaded (performance)  
✅ No auto-refresh  
✅ No popups  
✅ Clear labeling  
✅ Dismissible mobile footer  
✅ Session-aware  

---

## License

Proprietary - Tax Letter Help  
© 2025 TaxLetterHelp. All rights reserved.
