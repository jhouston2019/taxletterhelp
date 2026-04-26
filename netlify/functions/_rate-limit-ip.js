/**
 * Per-IP sliding-window rate limit for serverless (in-process Map).
 * Mitigates abuse on unauthenticated or high-cost routes. Not a substitute for
 * distributed Redis limits at very high scale — sufficient as a "simple" guard.
 */
function getRequestIp(event) {
  const h = event.headers || {};
  const xff = h['x-forwarded-for'] || h['X-Forwarded-For'] || '';
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return (
    h['x-nf-client-connection-ip'] ||
    h['X-NF-Client-Connection-IP'] ||
    h['client-ip'] ||
    'unknown'
  );
}

/**
 * @param {string} ip
 * @param {object} [options]
 * @param {string} [options.namespace] - Separate bucket per route
 * @param {number} [options.maxRequests=30]
 * @param {number} [options.windowMs=900000] - Default 15 minutes
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
function checkIpRateLimit(ip, options = {}) {
  const namespace = options.namespace || 'default';
  const maxRequests = options.maxRequests ?? 30;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const now = Date.now();
  if (!global.__tldpRateIpBuckets) {
    global.__tldpRateIpBuckets = new Map();
  }
  const key = `${namespace}::${String(ip || 'unknown')}`;
  let times = global.__tldpRateIpBuckets.get(key) || [];
  times = times.filter((t) => now - t < windowMs);
  if (times.length >= maxRequests) {
    const oldest = times[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  times.push(now);
  global.__tldpRateIpBuckets.set(key, times);
  return { ok: true };
}

module.exports = { getRequestIp, checkIpRateLimit };
