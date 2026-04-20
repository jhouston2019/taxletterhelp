const { getSupabaseAdmin } = require("./_supabase.js");
const { getBillingSnapshot } = require("./_billing-snapshot.js");
const { getUserFromBearer } = require("./_request-auth.js");

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { user, error } = await getUserFromBearer(event);
    if (!user) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ authenticated: false, error }),
      };
    }

    const supabase = getSupabaseAdmin();
    const billing = await getBillingSnapshot(supabase, user.id);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata,
        },
        billing,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
