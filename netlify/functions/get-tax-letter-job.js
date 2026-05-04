const { wrapHandler, trackError } = require("./_error-tracking.js");
const { getSupabaseAdmin } = require("./_supabase.js");
const { getUserFromBearer } = require("./_request-auth.js");

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function readJobId(event) {
  const q = event.queryStringParameters || {};
  if (q.job_id || q.jobId) return q.job_id || q.jobId;
  try {
    const b = JSON.parse(event.body || "{}");
    return b.job_id || b.jobId || null;
  } catch {
    return null;
  }
}

function readWant(event) {
  const q = event.queryStringParameters || {};
  if (q.want) return q.want;
  try {
    const b = JSON.parse(event.body || "{}");
    return b.want || "full";
  } catch {
    return "full";
  }
}

/** Build preview-only payload matching frontend contract (no full analysis/letter). */
function unifiedFromRow(row) {
  if (row.job_full_json && typeof row.job_full_json === "object") return row.job_full_json;
  const aj = row.analysis_json && typeof row.analysis_json === "object" ? row.analysis_json : null;
  if (aj && aj.notice && aj.letter_full && aj.analysis_full) return aj;
  return null;
}

function previewPayloadFromRow(row) {
  const snap = row.preview_snapshot && typeof row.preview_snapshot === "object" ? row.preview_snapshot : null;
  if (snap && snap.notice && snap.risk && snap.preview) return snap;

  const full = unifiedFromRow(row);
  if (full && full.notice && full.risk && full.preview) {
    return {
      notice: full.notice,
      risk: full.risk,
      preview: full.preview,
    };
  }

  return null;
}

function fullPayloadFromRow(row) {
  const full = unifiedFromRow(row);
  const letter = row.letter_full || full?.letter_full || "";
  if (!full) {
    return {
      notice: {},
      risk: {},
      strategy: [],
      analysis_full: "",
      letter_full: letter,
      preview: {},
    };
  }
  return {
    notice: full.notice,
    risk: full.risk,
    strategy: Array.isArray(full.strategy) ? full.strategy : [],
    analysis_full: full.analysis_full || "",
    letter_full: letter,
    preview: full.preview || {},
  };
}

const mainHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const { user } = await getUserFromBearer(event);
  if (!user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const jobId = readJobId(event);
  if (!jobId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "job_id required" }) };
  }

  const want = String(readWant(event) || "full").toLowerCase();

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("tax_letter_jobs")
      .select("id, user_id, paid, is_unlocked, preview_snapshot, letter_full, analysis_json")
      .eq("id", jobId)
      .maybeSingle();

    if (error) throw error;
    if (!row || String(row.user_id) !== String(user.id)) {
      return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Forbidden" }) };
    }

    const paid = !!(row.paid && row.is_unlocked);

    if (want === "preview") {
      const prev = previewPayloadFromRow(row);
      if (!prev) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Preview not available for this job" }),
        };
      }
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          paid,
          job_id: row.id,
          notice: prev.notice,
          risk: prev.risk,
          preview: prev.preview,
        }),
      };
    }

    if (!paid) {
      return {
        statusCode: 402,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Payment required",
          code: "PAYMENT_REQUIRED",
          job_id: row.id,
        }),
      };
    }

    const payload = fullPayloadFromRow(row);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        paid: true,
        job_id: row.id,
        notice: payload.notice,
        risk: payload.risk,
        strategy: payload.strategy,
        analysis_full: payload.analysis_full,
        letter_full: payload.letter_full,
        preview: payload.preview,
      }),
    };
  } catch (e) {
    trackError(e, { functionName: "get-tax-letter-job" });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to load job" }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, "get-tax-letter-job");
