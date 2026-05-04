const Stripe = require("stripe");
const { wrapHandler, trackError } = require('./_error-tracking.js');
const { getSupabaseAdmin } = require("./_supabase.js");
const { getUserFromBearer } = require("./_request-auth.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  const { user } = await getUserFromBearer(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      body = {};
    }
    const jobId = body.job_id || body.jobId || null;
    const priceId = (process.env.STRIPE_PRICE_RESPONSE || "").trim();
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "job_id required" }),
      };
    }

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

    const supabase = getSupabaseAdmin();
    const { data: job, error: jobErr } = await supabase
      .from("tax_letter_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr || !job || String(job.user_id) !== String(user.id)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Forbidden" }),
      };
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
      customer_email: user.email,
      success_url: `${site}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/preview.html?job_id=${encodeURIComponent(jobId)}`,
      metadata: {
        job_id: String(jobId),
      },
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
