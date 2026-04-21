const Stripe = require("stripe");
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

async function loadPaidCheckoutSession(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer"],
  });
  const email = sessionEmail(session);
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  return { session, email, customerId };
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

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const sessionId = body.session_id || body.sessionId;
    const emailIn = (body.email || "").trim().toLowerCase();
    const password = body.password;

    if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Invalid session_id" }),
      };
    }
    if (!emailIn || !password || typeof password !== "string") {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "email and password required" }),
      };
    }
    if (password.length < 8) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Password must be at least 8 characters" }),
      };
    }

    const { session, email: stripeEmail, customerId } = await loadPaidCheckoutSession(sessionId);

    if (session.payment_status !== "paid") {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Payment not verified" }),
      };
    }
    if (!stripeEmail || stripeEmail !== emailIn) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Email does not match payment session" }),
      };
    }

    const supabase = getSupabaseAdmin();

    const { data: existingUid } = await supabase.rpc("tlh_auth_uid_for_email", {
      lookup_email: emailIn,
    });
    if (existingUid) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "account_exists" }),
      };
    }

    const create = await supabase.auth.admin.createUser({
      email: emailIn,
      password,
      email_confirm: true,
      user_metadata: {
        stripe_customer_id: customerId || undefined,
        plan: "single",
      },
    });

    if (create.error) {
      const msg = create.error.message || "";
      if (/already|registered|exists/i.test(msg)) {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({ error: "account_exists" }),
        };
      }
      throw create.error;
    }

    const userId = create.data.user?.id;
    if (!userId) {
      throw new Error("User create returned no id");
    }

    await supabase.from("users").upsert(
      { id: userId, email: emailIn },
      { onConflict: "id" }
    );

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!existingSub) {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        stripe_customer_id: customerId,
        plan_type: "single",
        status: "active",
      });
    }

    await supabase.from("paid_sessions").upsert(
      {
        stripe_session_id: sessionId,
        user_id: userId,
        plan: "single",
        status: "in_progress",
      },
      { onConflict: "stripe_session_id" }
    );

    const site = (process.env.SITE_URL || "").replace(/\/$/, "");
    const redirectTo = `${site}/wizard`;

    const link = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: emailIn,
      options: { redirectTo },
    });

    if (link.error) throw link.error;

    const hashed = link.data?.properties?.hashed_token;

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        token_hash: hashed,
        type: "magiclink",
        email: emailIn,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e.message || "Account creation failed" }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, "create-account-from-stripe");
