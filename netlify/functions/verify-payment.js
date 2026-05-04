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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const token = getBearer(event);
  if (!token) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized", success: false }) };
  }

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized", success: false }) };
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

    const user = userData.user;
    const jobId = session.metadata?.job_id;
    if (jobId) {
      const { data: job } = await supabase.from("tax_letter_jobs").select("user_id").eq("id", jobId).maybeSingle();
      if (!job || String(job.user_id) !== String(user.id || "")) {
        return {
          statusCode: 403,
          headers: cors,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }
    } else if (String(session.metadata?.user_id || "") !== String(user.id || "")) {
      return {
        statusCode: 403,
        headers: cors,
        body: JSON.stringify({ error: "Forbidden" }),
      };
    }

    if (session.payment_status !== "paid") {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: true, pending: true }),
      };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ success: true, verified: true }),
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
