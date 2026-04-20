/**
 * Single source of truth for plan, renewal, and usage reads.
 * All billing-facing APIs should use getBillingSnapshot(supabase, userId).
 */

function planReviewLimit(planType) {
  const p = (planType || "").toLowerCase();
  if (p === "single") return 1;
  if (p === "premier") return 3;
  if (p === "enterprise") return -1;
  if (p === "starter" || p === "standard" || p === "complex") return 1;
  if (p === "pro") return 3;
  if (p === "proplus") return -1;
  return 0;
}

async function getBillingSnapshot(supabase, userId) {
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr) {
    console.warn("[getBillingSnapshot] subscription read", subErr.message);
  }

  const { data: usageRow } = await supabase
    .from("user_review_usage")
    .select("review_count")
    .eq("user_id", userId)
    .maybeSingle();

  const used = usageRow?.review_count ?? 0;
  const planType = sub?.plan_type || null;
  const limit = planReviewLimit(planType);
  const active =
    sub &&
    sub.status === "active" &&
    planType &&
    planType.toLowerCase() !== "free" &&
    planType.toLowerCase() !== "none";

  const renewal =
    sub?.current_period_end != null
      ? new Date(sub.current_period_end).toISOString()
      : null;

  return {
    plan_type: planType || "none",
    active: active === true,
    active_explicit: active === true,
    renewal_date: renewal,
    usage: {
      used,
      limit,
      remaining: limit === -1 ? null : Math.max(0, limit - used),
    },
    subscription: sub || null,
  };
}

module.exports = { getBillingSnapshot, planReviewLimit };
