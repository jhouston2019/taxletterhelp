const Stripe = require("stripe");
const { getSupabaseAdmin } = require("./_supabase.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getBearer(event) {
  const h = event.headers?.authorization || event.headers?.Authorization;
  if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

function sessionEmail(session) {
  const e =
    session.customer_details?.email ||
    session.customer_email ||
    (typeof session.customer === "object" && session.customer && !session.customer.deleted
      ? session.customer.email
      : null);
  return e ? String(e).trim().toLowerCase() : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let sid;
  try {
    const body = JSON.parse(event.body || "{}");
    sid = body.sessionId || body.session_id;
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
  }

  if (!sid) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ success: false, error: "session_id required" }),
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sid, {
      expand: ["customer", "line_items"],
    });

    const jobId = session.metadata?.job_id || null;
    const metaUserId = session.metadata?.user_id || null;
    const email = sessionEmail(session);

    if (session.payment_status !== "paid") {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: true, paid: false, pending: true }),
      };
    }

    const token = getBearer(event);

    if (!token) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          success: true,
          paid: true,
          verified: true,
          email: email || null,
          job_id: jobId,
        }),
      };
    }

    const supabase = getSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized", success: false }) };
    }

    const user = userData.user;

    if (jobId) {
      const { data: job } = await supabase.from("tax_letter_jobs").select("user_id").eq("id", jobId).maybeSingle();
      const uid = job?.user_id;
      if (uid != null && String(uid) !== String(user.id || "")) {
        return {
          statusCode: 403,
          headers: cors,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }
    } else if (metaUserId && String(metaUserId) !== String(user.id || "")) {
      return {
        statusCode: 403,
        headers: cors,
        body: JSON.stringify({ error: "Forbidden" }),
      };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        paid: true,
        verified: true,
        job_id: jobId,
        email: email || user.email || null,
      }),
    };
  } catch (e) {
    console.error("[verify-payment]", e);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        success: false,
        error: e.message,
      }),
    };
  }
};
