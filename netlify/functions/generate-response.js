/**
 * Deprecated: response text is produced once in generate-full-job.js (analyze-letter pipeline).
 */
const { createClient } = require("@supabase/supabase-js");
const { wrapHandler } = require("./_error-tracking.js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const mainHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: cors,
      body: JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return {
      statusCode: 401,
      headers: cors,
      body: JSON.stringify({ error: "Invalid or expired session", code: "AUTH_INVALID" }),
    };
  }

  return {
    statusCode: 410,
    headers: cors,
    body: JSON.stringify({
      error: "Deprecated",
      message:
        "Letter generation uses a single pipeline when you upload your notice. Use analyze-letter, then unlock after payment.",
    }),
  };
};

exports.handler = wrapHandler(mainHandler, "generate-response");
