/**
 * Deprecated: response text is produced once in generate-full-job.js (analyze-letter pipeline).
 */
const { wrapHandler } = require("./_error-tracking.js");
const { getUserFromBearer } = require("./_request-auth.js");

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

  const { user } = await getUserFromBearer(event);
  if (!user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };
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
