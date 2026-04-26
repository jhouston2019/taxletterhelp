const Stripe = require("stripe");
const { wrapHandler, trackError } = require('./_error-tracking.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function clientErrorMessage(err) {
  if (!err) return "Unknown error";
  if (err.type && err.message) return err.message;
  return err.message || String(err);
}

const mainHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed", details: "Use POST" }),
    };
  }

  try {
    console.log("SITE_URL:", process.env.SITE_URL ? "set" : "missing");
    console.log("STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "set" : "missing");
    console.log("STRIPE_PRICE_RESPONSE:", process.env.STRIPE_PRICE_RESPONSE || "missing");

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      body = {};
    }
    const { recordId = null } = body;
    const priceId = (process.env.STRIPE_PRICE_RESPONSE || "").trim();
    
    if (!process.env.SITE_URL) {
      throw new Error(
        "SITE_URL is not set in Netlify (Site settings → Environment variables). Use your site URL, e.g. https://taxletterdefensepro.com"
      );
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set in Netlify. Add your Stripe secret key (sk_test_… or sk_live_…)."
      );
    }
    if (!priceId) {
      throw new Error(
        "STRIPE_PRICE_RESPONSE is not set. In Stripe Dashboard copy the Price ID (price_…) for your $29 product and add it to Netlify."
      );
    }

    const site = (process.env.SITE_URL || "").replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ 
        price: priceId, 
        quantity: 1 
      }],
      mode: 'payment',
      customer_creation: 'always',
      success_url: `${site}/account-setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/pricing`,
      metadata: {
        ...(recordId ? { recordId } : {}),
        plan: 'single',
        plan_type: 'single',
        price_id: priceId,
        product_type: 'irs_notice_response',
        pricing_model: 'one_time',
        risk_level: 'regulated',
        ai_mode: 'constrained_procedural',
        not_chat_based: 'true',
        price_point: '29'
      }
    });

    const keyIsTest = String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");
    console.log("[create-checkout-session]", {
      livemode: session.livemode,
      keyIsTest,
      priceId,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        url: session.url,
        livemode: session.livemode,
        stripe_secret_key_mode: keyIsTest ? "test" : "live",
      }),
    };
  } catch (error) {
    trackError(error, { functionName: "create-checkout-session" });
    const details = clientErrorMessage(error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Failed to create checkout session",
        details,
      }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, 'create-checkout-session');
