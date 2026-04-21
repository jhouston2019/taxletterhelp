const Stripe = require("stripe");
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
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const sessionId = body.session_id || body.sessionId;
    if (!sessionId || typeof sessionId !== "string") {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "session_id required" }),
      };
    }
    if (!sessionId.startsWith("cs_")) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Invalid session_id" }),
      };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });

    if (session.payment_status !== "paid") {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Payment not completed" }),
      };
    }

    const email = sessionEmail(session);
    if (!email) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: "Could not read email from checkout session" }),
      };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        email,
        payment_status: session.payment_status,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e.message || "Failed to load session" }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, "get-stripe-session");
