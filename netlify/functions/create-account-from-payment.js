const crypto = require("crypto");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { getSupabaseAdmin } = require("./_supabase.js");
const { wrapHandler } = require("./_error-tracking.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sessionEmail(session) {
  const e =
    session.customer_details?.email ||
    session.customer_email ||
    (typeof session.customer === "object" && session.customer && !session.customer.deleted
      ? session.customer.email
      : null);
  return e ? String(e).trim().toLowerCase() : null;
}

function anonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY required for session creation");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const mainHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const sessionId = body.session_id || body.sessionId;
  const emailIn = (body.email || "").trim().toLowerCase();

  if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: "Invalid session_id" }),
    };
  }
  if (!emailIn) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: "email required" }),
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });

    if (session.payment_status !== "paid") {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Payment not verified" }),
      };
    }

    const stripeEmail = sessionEmail(session);
    if (!stripeEmail || stripeEmail !== emailIn) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Email does not match payment session" }),
      };
    }

    const supabase = getSupabaseAdmin();
    const password = crypto.randomBytes(24).toString("base64url");

    const create = await supabase.auth.admin.createUser({
      email: emailIn,
      password,
      email_confirm: true,
      user_metadata: { plan: "single", checkout_session_id: sessionId },
    });

    if (create.error) {
      const msg = create.error.message || "";
      if (/already|registered|exists/i.test(msg)) {
        return {
          statusCode: 409,
          headers: cors,
          body: JSON.stringify({
            error: "account_exists",
            message: "Sign in with this email to view your letter.",
          }),
        };
      }
      throw create.error;
    }

    const userId = create.data.user?.id;
    if (!userId) {
      throw new Error("User create returned no id");
    }

    await supabase.from("users").upsert({ id: userId, email: emailIn }, { onConflict: "id" });

    const jobId = session.metadata?.job_id;
    if (jobId) {
      await supabase
        .from("tax_letter_jobs")
        .update({ user_id: userId, email: emailIn })
        .eq("id", jobId);
    }
    await supabase
      .from("tax_letter_jobs")
      .update({ user_id: userId, email: emailIn })
      .eq("stripe_session_id", sessionId);

    const sbAnon = anonClient();
    const { data: signInData, error: signInErr } = await sbAnon.auth.signInWithPassword({
      email: emailIn,
      password,
    });

    if (signInErr || !signInData?.session) {
      console.error("[create-account-from-payment] signIn", signInErr);
      throw new Error("Account created but session could not be started. Use password reset.");
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: userId,
        job_id: jobId || null,
      }),
    };
  } catch (e) {
    console.error("[create-account-from-payment]", e);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e.message || "Account creation failed" }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, "create-account-from-payment");
