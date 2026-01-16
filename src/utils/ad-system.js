/**
 * Tax Letter Help - Native Ad System with Google AdSense
 * Conversion-safe monetization for non-buyers
 * 
 * RULES:
 * - Max 3 ads desktop, 2 mobile
 * - No ads above fold, near CTAs, or in instructions
 * - Disabled on checkout/login/dashboard
 * - Lazy-loaded, dismissible, session-aware
 */

// ========================================
// GLOBAL AD CONFIGURATION
// ========================================

// Master toggle - set to false to disable all ads globally
const ADS_ENABLED = true;

// Google AdSense configuration
const AD_CONFIG = {
  ENABLED: ADS_ENABLED, // Master toggle
  PROVIDER: 'adsense',
  
  // REPLACE WITH YOUR ADSENSE CLIENT ID
  CLIENT_ID: 'ca-pub-XXXXXXXXXXXXXXXX', // TODO: Replace with real AdSense client ID
  
  // REPLACE WITH YOUR AD SLOT IDS
  AD_SLOTS: {
    POST_CONTENT: 'XXXXXXXXXX', // TODO: Replace with post-content ad slot ID
    EXIT_GRID: 'XXXXXXXXXX',     // TODO: Replace with exit grid ad slot ID
    MOBILE_FOOTER: 'XXXXXXXXXX'  // TODO: Replace with mobile footer ad slot ID
  },
  
  // Ad density limits
  MAX_DESKTOP_ADS: 3,
  MAX_MOBILE_ADS: 2,
  
  // Scroll thresholds
  SCROLL_THRESHOLD_EXIT: 0.80, // 80% scroll for exit grid
  SCROLL_THRESHOLD_MOBILE: 0.50, // 50% scroll for mobile footer
  MOBILE_FOOTER_DELAY: 10000, // 10 seconds
  
  // Page exclusions (no ads on these paths)
  EXCLUDED_PAGES: [
    '/checkout',
    '/payment',
    '/login',
    '/signup',
    '/dashboard',
    '/upload',
    '/admin',
    '/cancel',
    '/success',
    '/thank-you'
  ]
};

// Session storage keys
const STORAGE_KEYS = {
  MOBILE_FOOTER_DISMISSED: 'tlh_mobile_footer_dismissed',
  SESSION_START: 'tlh_session_start'
};

/**
 * Check if ads should be enabled on current page
 */
function shouldShowAds() {
  if (!AD_CONFIG.ENABLED) {
    return false;
  }

  const currentPath = window.location.pathname;
  
  // Check if current page is excluded
  const isExcluded = AD_CONFIG.EXCLUDED_PAGES.some(page => 
    currentPath.includes(page)
  );

  return !isExcluded;
}

/**
 * Detect device type
 */
function isMobileDevice() {
  return window.innerWidth <= 768;
}

/**
 * Initialize post-content native ad
 */
function initPostContentAd() {
  const adContainer = document.getElementById('ad-post-content');
  if (!adContainer) return;

  // Lazy load when in viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadPostContentAd(adContainer);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });

  observer.observe(adContainer);
}

/**
 * Load AdSense script (once per page)
 */
function loadAdSenseScript() {
  // Check if script already loaded
  if (document.querySelector('script[src*="adsbygoogle.js"]')) {
    console.log('AdSense script already loaded');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.CLIENT_ID}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('AdSense script loaded successfully');
      resolve();
    };
    
    script.onerror = () => {
      console.error('Failed to load AdSense script');
      reject(new Error('AdSense script load failed'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Load post-content ad (Google AdSense responsive native)
 */
function loadPostContentAd(container) {
  if (!ADS_ENABLED || !AD_CONFIG.ENABLED) {
    console.log('Ads disabled - skipping post-content ad');
    return;
  }

  // Check if already loaded
  if (container.dataset.loaded === 'true') {
    console.log('Post-content ad already loaded');
    return;
  }

  console.log('Loading post-content ad...');

  // Create AdSense ad unit
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', AD_CONFIG.CLIENT_ID);
  ins.setAttribute('data-ad-slot', AD_CONFIG.AD_SLOTS.POST_CONTENT);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');

  container.appendChild(ins);

  // Initialize ad
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    container.dataset.loaded = 'true';
    console.log('Post-content ad initialized');
  } catch (error) {
    console.error('Error initializing post-content ad:', error);
  }
}

/**
 * Initialize exit/scroll-end native grid (desktop only)
 */
function initExitGridAd() {
  if (isMobileDevice()) return;

  const adContainer = document.getElementById('ad-exit-grid');
  if (!adContainer) return;

  let hasTriggered = false;

  const checkScroll = () => {
    if (hasTriggered) return;

    const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    
    if (scrollPercent >= AD_CONFIG.SCROLL_THRESHOLD_EXIT) {
      hasTriggered = true;
      loadExitGridAd(adContainer);
      window.removeEventListener('scroll', checkScroll);
    }
  };

  window.addEventListener('scroll', checkScroll, { passive: true });
}

/**
 * Load exit grid ad (Google AdSense - desktop only)
 */
function loadExitGridAd(container) {
  if (!ADS_ENABLED || !AD_CONFIG.ENABLED) {
    console.log('Ads disabled - skipping exit grid ad');
    return;
  }

  // Desktop only check
  if (window.innerWidth < 1024) {
    console.log('Exit grid ad skipped - not desktop viewport');
    return;
  }

  // Check if already loaded
  if (container.dataset.loaded === 'true') {
    console.log('Exit grid ad already loaded');
    return;
  }

  console.log('Loading exit grid ad...');

  // Create AdSense ad unit
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', AD_CONFIG.CLIENT_ID);
  ins.setAttribute('data-ad-slot', AD_CONFIG.AD_SLOTS.EXIT_GRID);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');

  container.appendChild(ins);

  // Initialize ad
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    container.dataset.loaded = 'true';
    console.log('Exit grid ad initialized');
  } catch (error) {
    console.error('Error initializing exit grid ad:', error);
  }
}

/**
 * Initialize mobile footer sticky ad
 */
function initMobileFooterAd() {
  if (!isMobileDevice()) return;

  const adContainer = document.querySelector('.mobile-footer-ad');
  if (!adContainer) return;

  // Check if already dismissed this session
  if (sessionStorage.getItem(STORAGE_KEYS.MOBILE_FOOTER_DISMISSED)) {
    return;
  }

  let hasTriggered = false;
  let timeoutId = null;

  // Trigger on scroll threshold OR time delay (whichever comes first)
  const showAd = () => {
    if (hasTriggered) return;
    hasTriggered = true;

    loadMobileFooterAd(adContainer);
    adContainer.classList.add('visible');

    // Setup close button
    const closeBtn = adContainer.querySelector('.ad-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        adContainer.classList.remove('visible');
        sessionStorage.setItem(STORAGE_KEYS.MOBILE_FOOTER_DISMISSED, 'true');
      });
    }

    // Cleanup
    window.removeEventListener('scroll', checkScroll);
    if (timeoutId) clearTimeout(timeoutId);
  };

  const checkScroll = () => {
    if (hasTriggered) return;

    const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    
    if (scrollPercent >= AD_CONFIG.SCROLL_THRESHOLD_MOBILE) {
      showAd();
    }
  };

  // Time-based trigger
  timeoutId = setTimeout(showAd, AD_CONFIG.MOBILE_FOOTER_DELAY);

  // Scroll-based trigger
  window.addEventListener('scroll', checkScroll, { passive: true });
}

/**
 * Load mobile footer ad (Google AdSense - mobile only)
 */
function loadMobileFooterAd(container) {
  if (!ADS_ENABLED || !AD_CONFIG.ENABLED) {
    console.log('Ads disabled - skipping mobile footer ad');
    return;
  }

  // Mobile only check
  if (window.innerWidth >= 768) {
    console.log('Mobile footer ad skipped - not mobile viewport');
    return;
  }

  const adSlot = container.querySelector('#ad-mobile-footer');
  if (!adSlot) {
    console.error('Mobile footer ad slot not found');
    return;
  }

  // Check if already loaded
  if (adSlot.dataset.loaded === 'true') {
    console.log('Mobile footer ad already loaded');
    return;
  }

  console.log('Loading mobile footer ad...');

  // Create AdSense ad unit
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', AD_CONFIG.CLIENT_ID);
  ins.setAttribute('data-ad-slot', AD_CONFIG.AD_SLOTS.MOBILE_FOOTER);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');

  adSlot.appendChild(ins);

  // Initialize ad
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    adSlot.dataset.loaded = 'true';
    console.log('Mobile footer ad initialized');
  } catch (error) {
    console.error('Error initializing mobile footer ad:', error);
  }
}

/**
 * Initialize session tracking
 */
function initSessionTracking() {
  if (!sessionStorage.getItem(STORAGE_KEYS.SESSION_START)) {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());
  }
}

/**
 * Main initialization
 */
export async function initAdSystem() {
  // Check if ads should be shown
  if (!shouldShowAds()) {
    console.log('Ads disabled on this page');
    return;
  }

  console.log('Initializing ad system with Google AdSense...');

  // Validate configuration
  if (AD_CONFIG.CLIENT_ID === 'ca-pub-XXXXXXXXXXXXXXXX') {
    console.warn('⚠️ AdSense CLIENT_ID not configured - using placeholder');
  }

  // Load AdSense script first
  try {
    await loadAdSenseScript();
  } catch (error) {
    console.error('Failed to load AdSense script:', error);
    return;
  }

  // Initialize session tracking
  initSessionTracking();

  // Initialize ad units based on device
  initPostContentAd();
  
  if (isMobileDevice()) {
    initMobileFooterAd();
  } else {
    initExitGridAd();
  }

  console.log('Ad system initialized successfully');
}

/**
 * Manually disable ads (for testing or emergency)
 */
export function disableAds() {
  AD_CONFIG.ENABLED = false;
  console.log('Ads manually disabled');
}

/**
 * Manually enable ads
 */
export function enableAds() {
  AD_CONFIG.ENABLED = true;
  console.log('Ads manually enabled');
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdSystem);
} else {
  initAdSystem();
}
