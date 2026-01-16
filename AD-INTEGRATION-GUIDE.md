# Tax Letter Help - Ad System Integration Guide

## Overview

This guide explains how to integrate conversion-safe native ad placements into Tax Letter Help pages.

## Quick Start

### 1. Add CSS to Page Head

```html
<link rel="stylesheet" href="/src/styles/ad-system.css">
```

### 2. Add JavaScript Before Closing `</body>`

```html
<script type="module" src="/src/utils/ad-system.js"></script>
```

### 3. Insert Ad Containers

Choose placements based on page type and device target.

---

## Ad Placement Templates

### 1️⃣ POST-CONTENT NATIVE AD (Primary Unit)

**Where:** Immediately after main explanatory content, before FAQs or secondary sections

**Desktop + Mobile:** Both

```html
<!-- POST-CONTENT NATIVE AD -->
<section class="native-ad post-content-ad">
  <p class="ad-label">Sponsored Resources</p>
  <div id="ad-post-content"></div>
</section>
```

**Example placement in content page:**

```html
<h2>What to Do Next</h2>
<p>Follow these steps to respond...</p>

<!-- POST-CONTENT NATIVE AD -->
<section class="native-ad post-content-ad">
  <p class="ad-label">Sponsored Resources</p>
  <div id="ad-post-content"></div>
</section>

<h2>Frequently Asked Questions</h2>
```

---

### 2️⃣ EXIT / SCROLL-END NATIVE GRID (Desktop Only)

**Where:** Bottom of page, appears after 80% scroll depth

**Desktop Only:** Hidden on mobile

```html
<!-- EXIT GRID AD (DESKTOP ONLY) -->
<section class="native-ad exit-grid-ad desktop-only">
  <p class="ad-label">Additional Options You May Consider</p>
  <div id="ad-exit-grid"></div>
</section>
```

**Example placement:**

```html
<footer class="footer">
  <p>© 2025 TaxLetterHelp...</p>
</footer>

<!-- EXIT GRID AD (DESKTOP ONLY) -->
<section class="native-ad exit-grid-ad desktop-only">
  <p class="ad-label">Additional Options You May Consider</p>
  <div id="ad-exit-grid"></div>
</section>

</body>
</html>
```

---

### 3️⃣ MOBILE FOOTER STICKY (Mobile Only)

**Where:** Fixed footer, appears after 50% scroll OR 10 seconds

**Mobile Only:** Hidden on desktop

```html
<!-- MOBILE FOOTER STICKY AD -->
<div class="native-ad mobile-footer-ad mobile-only">
  <button class="ad-close" aria-label="Close ad">×</button>
  <div id="ad-mobile-footer"></div>
</div>
```

**Example placement (before closing `</body>`):**

```html
<footer class="footer">
  <p>© 2025 TaxLetterHelp...</p>
</footer>

<!-- MOBILE FOOTER STICKY AD -->
<div class="native-ad mobile-footer-ad mobile-only">
  <button class="ad-close" aria-label="Close ad">×</button>
  <div id="ad-mobile-footer"></div>
</div>

<script type="module" src="/src/utils/ad-system.js"></script>
</body>
</html>
```

---

## Complete Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title | TaxLetterHelp</title>
  
  <!-- Existing styles -->
  <link rel="stylesheet" href="/seo-shared-styles.css">
  
  <!-- Ad system styles -->
  <link rel="stylesheet" href="/src/styles/ad-system.css">
</head>
<body>
  <header class="header">
    <!-- Header content -->
  </header>

  <main class="container">
    <h1>Page Title</h1>
    
    <!-- Main content -->
    <p>Your main explanatory content goes here...</p>
    
    <!-- POST-CONTENT NATIVE AD -->
    <section class="native-ad post-content-ad">
      <p class="ad-label">Sponsored Resources</p>
      <div id="ad-post-content"></div>
    </section>
    
    <!-- Secondary content (FAQs, etc.) -->
    <h2>Frequently Asked Questions</h2>
    
    <div class="disclaimer">
      <strong>Disclaimer:</strong> This tool provides informational assistance only...
    </div>
  </main>

  <footer class="footer">
    <p>© 2025 TaxLetterHelp...</p>
  </footer>

  <!-- EXIT GRID AD (DESKTOP ONLY) -->
  <section class="native-ad exit-grid-ad desktop-only">
    <p class="ad-label">Additional Options You May Consider</p>
    <div id="ad-exit-grid"></div>
  </section>

  <!-- MOBILE FOOTER STICKY AD -->
  <div class="native-ad mobile-footer-ad mobile-only">
    <button class="ad-close" aria-label="Close ad">×</button>
    <div id="ad-mobile-footer"></div>
  </div>

  <!-- Ad system initialization -->
  <script type="module" src="/src/utils/ad-system.js"></script>
</body>
</html>
```

---

## Device Rules

| Device  | Post-Content Ad | Exit Grid | Mobile Footer |
|---------|----------------|-----------|---------------|
| Desktop | ✓ Yes          | ✓ Yes     | ✗ No          |
| Mobile  | ✓ Yes          | ✗ No      | ✓ Yes         |
| Tablet  | ✓ Yes          | ✓ Yes     | ✗ No          |

---

## Pages Where Ads Are DISABLED

Ads are automatically disabled on:

- `/checkout` and `/payment` (conversion pages)
- `/login` and `/signup` (authentication)
- `/dashboard` (authenticated user area)
- `/upload` (product page)
- `/admin` (admin panel)
- `/cancel`, `/success`, `/thank-you` (post-transaction)

No configuration needed - the system handles this automatically.

---

## Ad Network Integration

### Current State

The system is ready with placeholder containers. Ad slots are marked with:

- `#ad-post-content`
- `#ad-exit-grid`
- `#ad-mobile-footer`

### Integration Steps

1. **Choose ad network** (Google AdSense, Media.net, etc.)

2. **Update `ad-system.js`** functions:
   - `loadPostContentAd()`
   - `loadExitGridAd()`
   - `loadMobileFooterAd()`

3. **Example: Google AdSense**

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

## Feature Flags

### Globally Disable Ads

In `ad-system.js`, set:

```javascript
const AD_CONFIG = {
  ENABLED: false, // Disable all ads
  // ...
};
```

### Runtime Control

```javascript
// Disable ads programmatically
import { disableAds } from '/src/utils/ad-system.js';
disableAds();

// Re-enable ads
import { enableAds } from '/src/utils/ad-system.js';
enableAds();
```

---

## Testing Checklist

### Desktop Testing

- [ ] Post-content ad loads after scrolling into view
- [ ] Exit grid appears after 80% scroll
- [ ] No mobile footer ad visible
- [ ] Max 3 ad units total
- [ ] Ads don't appear on excluded pages
- [ ] Ads don't interfere with CTAs

### Mobile Testing

- [ ] Post-content ad loads
- [ ] Mobile footer appears after 50% scroll OR 10 seconds
- [ ] Footer ad is dismissible (X button works)
- [ ] Footer dismissed state persists for session
- [ ] No exit grid visible
- [ ] Max 2 ad units total
- [ ] Footer doesn't overlap forms/buttons

### Cross-Browser

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Notes

- All ads are **lazy-loaded** (load only when needed)
- Exit grid loads only after scroll threshold
- Mobile footer loads on scroll OR timer (whichever first)
- Session storage prevents repeated mobile footer
- No auto-refresh or animation

---

## Visual Guidelines

### Ad Labels

- Use "Sponsored Resources" or "Related Services"
- Never use "Advertisement" (too formal)
- Never omit labels (required for transparency)

### Styling

- Neutral gray labels (#9ca3af)
- No bright colors or accents
- No borders that resemble CTAs
- Clear visual separation from content

---

## Support

For questions or issues:

1. Check browser console for ad system logs
2. Verify page is not in excluded list
3. Test with `AD_CONFIG.ENABLED = true`
4. Check device detection (mobile vs desktop)

---

## Summary

**End State:**
- Tax Letter Help monetizes non-buyers
- Preserves trust and conversions
- Adds stable revenue floor
- No impact on user experience
- Production-ready structure

**Revenue Model:**
- Primary: $97 product conversions
- Floor: Native ad impressions from non-buyers
- No popups, no interruptions, no auto-refresh
