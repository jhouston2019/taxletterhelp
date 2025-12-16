/**
 * ADMIN ACCESS VALIDATION (QA-ONLY)
 * 
 * Purpose: Server-side validation for operator testing access
 * Security: Admin key must match env variable exactly
 * Scope: QA/testing only - invisible to normal users
 * 
 * DO NOT MODIFY WITHOUT SECURITY REVIEW
 */

/**
 * Validates admin access key
 * @param {string} providedKey - Key from query string or header
 * @returns {boolean} - True if valid admin access
 */
function validateAdminKey(providedKey) {
  // Admin access disabled if no key configured
  const adminKey = process.env.ADMIN_ACCESS_KEY;
  if (!adminKey) {
    return false;
  }

  // Optional: Disable admin mode in production
  const enableAdmin = process.env.ENABLE_ADMIN_MODE;
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'production' && enableAdmin !== 'true') {
    console.warn('Admin mode attempted in production without ENABLE_ADMIN_MODE=true');
    return false;
  }

  // Exact match required
  return providedKey === adminKey;
}

/**
 * Netlify function to validate admin access
 * Returns admin status without exposing the key
 */
exports.handler = async (event) => {
  // CORS headers for client requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { adminKey } = JSON.parse(event.body || '{}');

    // Validate admin key
    const isValid = validateAdminKey(adminKey);

    // Return validation result (never expose the actual key)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        adminMode: isValid,
        message: isValid ? 'Admin access granted' : 'Invalid admin key',
      }),
    };
  } catch (error) {
    console.error('Admin validation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Validation failed' }),
    };
  }
};

// Export validation function for use in other Netlify functions
exports.validateAdminKey = validateAdminKey;

