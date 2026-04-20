const Stripe = require("stripe");
const { wrapHandler, trackError } = require("./_error-tracking.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Webhook is NOT an entitlement writer. verify-payment is the only DB writer for access.
 * This handler only verifies Stripe signatures and logs events.
 */
const mainHandler = async (event) => {
  try {
    const sig = event.headers["stripe-signature"];
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body || "");
    let evt;

    try {
      evt = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object;
      console.log("[WEBHOOK] checkout.session.completed (log only)", {
        id: session.id,
        payment_status: session.payment_status,
        customer_email: session.customer_email || session.customer_details?.email,
      });
    } else {
      console.log("[WEBHOOK] event (log only)", { type: evt.type, id: evt.id });
    }

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    trackError(e, { functionName: "stripe-webhook" });
    return { statusCode: 500, body: e.message };
  }
};

exports.handler = wrapHandler(mainHandler, "stripe-webhook");
