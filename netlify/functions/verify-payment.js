const Stripe = require("stripe");
const { getSupabaseAdmin } = require("./_supabase.js");
const {
  syncStripeEntitlementsFromCheckoutSession,
  resolveStripeCheckoutEmail,
} = require("../../lib/sync-stripe-session.js");

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
  const user = userData?.user;
  if (userErr || !user?.email) {
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
    const { data: existingProc } = await supabase
      .from("processed_sessions")
      .select("status, completed_at")
      .eq("stripe_session_id", sid)
      .maybeSingle();

    if (existingProc?.status === "completed") {
      console.log("[VERIFY_PAYMENT_FINAL]", { sessionId: sid, shortCircuit: "completed" });
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: true, pending: false, idempotent: true }),
      };
    }

    await supabase.from("processed_sessions").upsert(
      {
        stripe_session_id: sid,
        status: "pending",
        error_message: null,
      },
      { onConflict: "stripe_session_id" }
    );

    const checkoutSession = await stripe.checkout.sessions.retrieve(sid, {
      expand: ["customer", "line_items"],
    });

    const stripeEmail = await resolveStripeCheckoutEmail(checkoutSession, stripe);
    if (!stripeEmail) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ success: false, error: "stripe_email_missing" }),
      };
    }

    const jwtEmail = String(user.email).trim().toLowerCase();
    if (jwtEmail !== stripeEmail) {
      console.warn("[verify-payment] email mismatch", { jwtEmail, stripeEmail });
      return {
        statusCode: 403,
        headers: cors,
        body: JSON.stringify({ success: false, error: "Forbidden", reason: "email_mismatch" }),
      };
    }

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", stripeEmail)
      .maybeSingle();

    if (profileErr || !profile?.id || profile.id !== user.id) {
      console.warn("[verify-payment] user profile missing or id mismatch", {
        hasProfile: !!profile,
        match: profile?.id === user.id,
      });
      return {
        statusCode: 403,
        headers: cors,
        body: JSON.stringify({ success: false, error: "Forbidden", reason: "user_profile_missing" }),
      };
    }

    if (checkoutSession.payment_status !== "paid") {
      console.log("[VERIFY_PAYMENT_FINAL]", { sessionId: sid, pending: true, payment_status: checkoutSession.payment_status });
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          success: true,
          pending: true,
          payment_status: checkoutSession.payment_status,
        }),
      };
    }

    await syncStripeEntitlementsFromCheckoutSession({
      supabase,
      stripe,
      checkoutSession,
      userId: user.id,
    });

    await supabase
      .from("processed_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        user_id: user.id,
        error_message: null,
      })
      .eq("stripe_session_id", sid);

    console.log("[VERIFY_PAYMENT_FINAL]", { sessionId: sid, userId: user.id });

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ success: true, pending: false }),
    };
  } catch (e) {
    console.error("[verify-payment]", e);
    try {
      await supabase
        .from("processed_sessions")
        .update({
          status: "failed",
          error_message: e.message || "error",
        })
        .eq("stripe_session_id", sid);
    } catch (_) {
      /* ignore */
    }

    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        success: false,
        pending: true,
        error: e.message,
      }),
    };
  }
};
