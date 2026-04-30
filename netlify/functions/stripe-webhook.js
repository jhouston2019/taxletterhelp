const Stripe = require("stripe");
const { wrapHandler, trackError } = require("./_error-tracking.js");
const { getSupabaseAdmin } = require("./_supabase.js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ok = () => ({ statusCode: 200, body: "ok" });

const mainHandler = async (event) => {
  if (process.env.BYPASS_PAYMENT === "true") {
    return ok();
  }

  try {
    const sig = event.headers["stripe-signature"];
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body || "");
    let evt;

    try {
      evt = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return ok();
    }

    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object;

      const jobId = session.metadata.job_id;
      const userId = session.metadata.user_id;

      if (!jobId || !userId) {
        return ok();
      }

      const supabase = getSupabaseAdmin();
      const { data: existing } = await supabase
        .from("tax_letter_jobs")
        .select("paid")
        .eq("id", jobId)
        .maybeSingle();

      if (!existing) {
        return ok();
      }

      if (!existing.paid) {
        await supabase
          .from("tax_letter_jobs")
          .update({
            paid: true,
            is_unlocked: true,
            user_id: userId,
            stripe_session_id: session.id,
          })
          .eq("id", jobId);
      }
    }

    return ok();
  } catch (e) {
    trackError(e, { functionName: "stripe-webhook" });
    return ok();
  }
};

exports.handler = wrapHandler(mainHandler, "stripe-webhook");
