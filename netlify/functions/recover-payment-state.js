const Stripe = require("stripe");
const { getSupabaseAdmin } = require("./_supabase.js");
const { getBillingSnapshot } = require("./_billing-snapshot.js");
const { getUserFromBearer } = require("./_request-auth.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const sessionId = body.session_id || body.sessionId;
    const { user } = await getUserFromBearer(event);
    const supabase = getSupabaseAdmin();

    if (user) {
      const billing = await getBillingSnapshot(supabase, user.id);
      if (billing.active) {
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ next: "/wizard", state: "paid", billing }),
        };
      }
    }

    if (sessionId) {
      const { data: proc } = await supabase
        .from("processed_sessions")
        .select("status")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (proc?.status === "pending" || proc?.status === "failed") {
        return {
          statusCode: 200,
          headers: cors,
          body: JSON.stringify({ next: "/account-setup", state: "processing", session_id: sessionId }),
        };
      }

      try {
        const s = await stripe.checkout.sessions.retrieve(sessionId);
        if (s.payment_status === "paid") {
          return {
            statusCode: 200,
            headers: cors,
            body: JSON.stringify({ next: "/account-setup", state: "resume_setup", session_id: sessionId }),
          };
        }
      } catch (_) {
        /* ignore */
      }
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ next: "/pricing", state: "none" }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e.message, next: "/pricing" }),
    };
  }
};
