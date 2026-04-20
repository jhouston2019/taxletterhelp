const { getSupabaseAdmin } = require("./_supabase.js");

function getBearerToken(event) {
  const h = event.headers?.authorization || event.headers?.Authorization;
  if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

/**
 * Resolve Supabase auth user from Authorization: Bearer JWT.
 */
async function getUserFromBearer(event) {
  const token = getBearerToken(event);
  if (!token) return { user: null, error: "missing_token" };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error?.message || "invalid_token" };
  }
  return { user: data.user, error: null };
}

module.exports = { getBearerToken, getUserFromBearer };
