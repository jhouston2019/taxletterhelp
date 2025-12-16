/**
 * ADMIN MODE CLIENT UTILITY (QA-ONLY)
 * 
 * Purpose: Client-side admin mode detection and management
 * Security: Key validation happens server-side only
 * Scope: Operator testing infrastructure - invisible to users
 * 
 * Usage:
 *   - Access any page with ?admin_key=YOUR_SECRET_KEY
 *   - Admin mode persists in sessionStorage for testing session
 *   - Clears on browser close
 */

const ADMIN_KEY_PARAM = 'admin_key';
const ADMIN_SESSION_KEY = 'tax_letter_admin_mode';

/**
 * Check if admin mode is active
 * @returns {Promise<boolean>}
 */
export async function isAdminMode() {
  // Check URL for admin key
  const urlParams = new URLSearchParams(window.location.search);
  const adminKey = urlParams.get(ADMIN_KEY_PARAM);

  // If key in URL, validate it server-side
  if (adminKey) {
    const isValid = await validateAdminKeyServerSide(adminKey);
    if (isValid) {
      // Store in sessionStorage (clears on browser close)
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      // Remove key from URL for security
      removeAdminKeyFromUrl();
      return true;
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
  }

  // Check if admin mode was already validated this session
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

/**
 * Validate admin key with server
 * @param {string} adminKey
 * @returns {Promise<boolean>}
 */
async function validateAdminKeyServerSide(adminKey) {
  try {
    const response = await fetch('/.netlify/functions/validate-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.adminMode === true;
  } catch (error) {
    console.error('Admin validation failed:', error);
    return false;
  }
}

/**
 * Remove admin key from URL (security)
 */
function removeAdminKeyFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete(ADMIN_KEY_PARAM);
  window.history.replaceState({}, document.title, url.toString());
}

/**
 * Exit admin mode
 */
export function exitAdminMode() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  window.location.reload();
}

/**
 * Inject admin banner (visual indicator)
 */
export function injectAdminBanner() {
  // Only inject once
  if (document.getElementById('admin-mode-banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'admin-mode-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #dc2626;
    color: #ffffff;
    padding: 8px 16px;
    text-align: center;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  banner.innerHTML = `
    ⚠️ ADMIN MODE — QA ACCESS ONLY — PAYMENT CHECKS BYPASSED
    <button onclick="window.adminMode.exit()" style="
      margin-left: 16px;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.4);
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    ">EXIT ADMIN MODE</button>
  `;

  // Adjust body padding to prevent content overlap
  document.body.style.paddingTop = '40px';
  document.body.insertBefore(banner, document.body.firstChild);

  // Expose exit function globally
  window.adminMode = { exit: exitAdminMode };
}

/**
 * Bypass payment check (admin mode only)
 * @returns {boolean} - True if should bypass payment
 */
export function shouldBypassPayment() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

/**
 * Initialize admin mode on page load
 */
export async function initAdminMode() {
  const adminActive = await isAdminMode();
  
  if (adminActive) {
    console.log('%c[ADMIN MODE ACTIVE]', 'background: #dc2626; color: white; padding: 4px 8px; font-weight: bold;');
    injectAdminBanner();
  }

  return adminActive;
}

