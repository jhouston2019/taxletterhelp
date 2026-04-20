/**
 * Single internal sync: Stripe Checkout Session → tlh_letters, users, subscriptions, user_review_usage.
 * Called only from verify-payment (server-authoritative entitlement writer).
 */

function planFromSession(session) {
  const meta = session.metadata || {};
  if (meta.plan_type) return String(meta.plan_type).toLowerCase();
  return "single";
}

async function resolveEmail(session, stripe) {
  let email =
    session.customer_details?.email ||
    session.customer_email ||
    null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!email && customerId) {
    const cust = await stripe.customers.retrieve(customerId);
    if (cust && !cust.deleted) email = cust.email;
  }
  return email ? String(email).trim().toLowerCase() : null;
}

/**
 * @param {object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabase
 * @param {import('stripe').Stripe} params.stripe
 * @param {import('stripe').Stripe.Checkout.Session} params.checkoutSession
 * @param {string} params.userId - auth.users id (must equal public.users.id)
 */
async function syncStripeEntitlementsFromCheckoutSession({ supabase, stripe, checkoutSession, userId }) {
  const sid = checkoutSession.id;
  const email = await resolveEmail(checkoutSession, stripe);
  if (!email) {
    throw new Error("stripe_email_unresolved");
  }

  const customerId =
    typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : checkoutSession.customer?.id;

  const priceId =
    checkoutSession.metadata?.price_id ||
    checkoutSession.line_items?.data?.[0]?.price?.id ||
    process.env.STRIPE_PRICE_RESPONSE;

  const { data: letterRow } = await supabase
    .from("tlh_letters")
    .select("id")
    .eq("stripe_session_id", sid)
    .maybeSingle();

  if (letterRow?.id) {
    const { error } = await supabase
      .from("tlh_letters")
      .update({
        status: "paid",
        stripe_customer_id: customerId,
        user_email: email,
        price_id: priceId,
      })
      .eq("id", letterRow.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("tlh_letters").insert({
      stripe_session_id: sid,
      stripe_customer_id: customerId,
      user_email: email,
      price_id: priceId,
      letter_text: "Pending upload",
      status: "paid",
    });
    if (error) throw error;
  }

  const { error: userErr } = await supabase.from("users").upsert(
    { id: userId, email, stripe_customer_id: customerId || null },
    { onConflict: "id" }
  );
  if (userErr) throw userErr;

  const planType = planFromSession(checkoutSession);

  let subEnd = null;
  if (checkoutSession.subscription) {
    const subId =
      typeof checkoutSession.subscription === "string"
        ? checkoutSession.subscription
        : checkoutSession.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId);
    if (sub.current_period_end) {
      subEnd = new Date(sub.current_period_end * 1000).toISOString();
    }
  }

  const subRow = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: checkoutSession.subscription
      ? typeof checkoutSession.subscription === "string"
        ? checkoutSession.subscription
        : checkoutSession.subscription.id
      : null,
    plan_type: planType.toUpperCase(),
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: subEnd,
    updated_at: new Date().toISOString(),
  };

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSub?.id) {
    const { error } = await supabase.from("subscriptions").update(subRow).eq("id", existingSub.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("subscriptions").insert(subRow);
    if (error) throw error;
  }

  const { error: usageErr } = await supabase.from("user_review_usage").upsert(
    { user_id: userId, review_count: 0, updated_at: new Date().toISOString() },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (usageErr) throw usageErr;

  return { planType, email };
}

module.exports = {
  syncStripeEntitlementsFromCheckoutSession,
  resolveStripeCheckoutEmail: resolveEmail,
  planFromSession,
};
