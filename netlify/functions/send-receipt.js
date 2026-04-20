/**
 * Optional: trigger receipt email after successful payment (extend with SendGrid).
 */
const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ ok: false }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    console.log("[send-receipt]", { session_id: body.session_id || body.sessionId });
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, message: "Receipt pipeline acknowledged" }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
