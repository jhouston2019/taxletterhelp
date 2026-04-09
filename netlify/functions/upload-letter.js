const { getSupabaseAdmin } = require("./_supabase.js");

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { userId, fileName, fileBase64, contentType } = JSON.parse(event.body || "{}");
    if (!userId || !fileName || !fileBase64) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing userId, fileName, or fileBase64" }),
      };
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const objectPath = `${userId}/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("letters")
      .upload(objectPath, buffer, {
        contentType: contentType || "application/octet-stream",
      });
    if (uploadError) throw uploadError;

    const { data: insertData, error: insertError } = await supabase
      .from("documents")
      .insert([
        {
          user_id: userId,
          file_name: uniqueFileName,
          file_path: uploadData.path,
        },
      ])
      .select()
      .single();
    if (insertError) throw insertError;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ path: uploadData.path, document: insertData }),
    };
  } catch (e) {
    console.error("upload-letter:", e);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: e.message || "Upload failed" }),
    };
  }
};
