/**
 * @deprecated Legacy post-checkout session (magic link / user provisioning).
 * Replaced by account-setup.html + get-stripe-session + create-account-from-stripe.
 * Safe to delete after go-live confirmation — search repo for references first.
 */
const Stripe = require("stripe");
const { getSupabaseAdmin } = require("./_supabase.js");
const { wrapHandler, trackError } = require("./_error-tracking.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function resolveEmailAndCustomer(session) {
  let email =
    session.customer_details?.email ||
    session.customer_email ||
    null;
  let customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!email && customerId) {
    const cust = await stripe.customers.retrieve(customerId);
    if (cust && !cust.deleted) email = cust.email;
  }
  return { email: email ? String(email).trim().toLowerCase() : null, customerId };
}

const mainHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ success: false, error: "method_not_allowed" }),
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: false, error: "invalid_json" }),
      };
    }

    const sessionId = body.session_id || body.sessionId;
    if (!sessionId) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: false, error: "session_id required" }),
      };
    }

    const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });

    const { email, customerId } = await resolveEmailAndCustomer(checkout);
    if (!email) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: false, error: "Could not resolve customer email from Stripe session" }),
      };
    }

    const supabase = getSupabaseAdmin();
    const meta = checkout.metadata || {};

    let userId = null;
    const { data: uidFromRpc, error: rpcErr } = await supabase.rpc("tlh_auth_uid_for_email", {
      lookup_email: email,
    });
    if (!rpcErr && uidFromRpc) userId = uidFromRpc;

    if (!userId) {
      const create = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          stripe_customer_id: customerId || undefined,
          plan_hint: meta.plan_type || "single",
        },
      });
      if (create.error) {
        const msg = create.error.message || "";
        if (/already|registered|exists/i.test(msg)) {
          const retry = await supabase.rpc("tlh_auth_uid_for_email", { lookup_email: email });
          if (retry.data) userId = retry.data;
        } else {
          return {
            statusCode: 200,
            headers: cors,
            body: JSON.stringify({ success: false, error: msg || "user_create_failed" }),
          };
        }
      } else if (create.data?.user?.id) {
        userId = create.data.user.id;
      }
    }

    if (!userId) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: false, error: "Could not create or resolve user" }),
      };
    }

    await supabase.from("users").upsert(
      { id: userId, email, stripe_customer_id: customerId || null },
      { onConflict: "id" }
    );

    if (customerId) {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          stripe_customer_id: customerId,
          plan_hint: meta.plan_type || "single",
        },
      });
    }

    const site = (process.env.SITE_URL || "").replace(/\/$/, "");
    const redirectTo = `${site}/app`;

    const link = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
        data: {
          stripe_session_id: sessionId,
          stripe_customer_id: customerId || "",
        },
      },
    });

    if (link.error) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          success: false,
          error: link.error.message || "generate_link_failed",
        }),
      };
    }

    const hashed = link.data?.properties?.hashed_token;
    const actionLink = link.data?.properties?.action_link;

    console.log("[SESSION_FINALIZED]", { sessionId, userId, email: email.replace(/(.{2}).*@/, "$1***@") });

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        email,
        token_hash: hashed,
        action_link: actionLink,
        verify_type: "email",
        user_id: userId,
      }),
    };
  } catch (e) {
    trackError(e, { functionName: "create-session-from-stripe" });
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: false,
        error: e.message || "session creation failed",
      }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, "create-session-from-stripe");
