let mammoth, Tesseract;

try {
  mammoth = require("mammoth");
  Tesseract = require("tesseract.js");
} catch (importError) {
  console.error("Import error:", importError);
}

const { wrapHandler, trackError } = require("./_error-tracking.js");
const { getSupabaseAdmin } = require("./_supabase.js");
const { getUserFromBearer } = require("./_request-auth.js");
const { generateFullJob } = require("./generate-full-job.js");

const mainHandler = async (event) => {
  console.log("=== ANALYZE LETTER (single pipeline) ===");

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  const got = await getUserFromBearer(event);
  const authUser = got.user;
  if (!authUser) {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    const parsedBody = JSON.parse(event.body || "{}");
    const { text, fileUrl, imageUrl, userEmail = null } = parsedBody;
    let letterText = text || "";

    if (fileUrl) {
      try {
        if (fileUrl.startsWith("data:")) {
          const base64Data = fileUrl.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");

          if (fileUrl.includes("application/pdf")) {
            console.log("PDF data URL: skipping server-side PDF parse; use extract-text or pasted text.");
          } else if (
            fileUrl.includes("application/vnd.openxmlformats") ||
            fileUrl.includes("application/msword")
          ) {
            if (!mammoth) {
              letterText += "\n\n[Word document uploaded but processing not available - please paste text manually]";
            } else {
              const { value } = await mammoth.extractRawText({ buffer });
              letterText += "\n\n" + value;
            }
          }
        } else {
          const fileResponse = await globalThis.fetch(fileUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
          }
          const fileBuffer = await fileResponse.arrayBuffer();
          const uint8 = new Uint8Array(fileBuffer);

          if (fileUrl.endsWith(".pdf")) {
            console.log("PDF URL: skipping server-side PDF parse; use pasted text.");
          } else if (fileUrl.endsWith(".doc") || fileUrl.endsWith(".docx")) {
            if (!mammoth) {
              letterText += "\n\n[Word document uploaded but processing not available - please paste text manually]";
            } else {
              const { value } = await mammoth.extractRawText({ buffer: Buffer.from(uint8) });
              letterText += "\n\n" + value;
            }
          }
        }
      } catch (fileError) {
        console.error("File processing error:", fileError);
        letterText += "\n\n[File processing error - using text from request body if any]";
      }
    }

    if (imageUrl) {
      try {
        if (!Tesseract) {
          letterText += "\n\n[Image uploaded but OCR processing not available - please paste text manually]";
        } else {
          const {
            data: { text: extractedText },
          } = await Tesseract.recognize(imageUrl, "eng");
          letterText += "\n\n" + extractedText;
        }
      } catch (imageError) {
        console.error("Image processing error:", imageError);
        letterText += "\n\n[Image processing error - please paste text manually]";
      }
    }

    if (!letterText.trim()) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "No text provided or extracted from files." }),
      };
    }

    const unified = await generateFullJob(letterText);

    const preview_snapshot = {
      notice: unified.notice,
      risk: unified.risk,
      preview: unified.preview,
    };

    let recordId = null;
    if (getSupabaseAdmin) {
      try {
        const supabase = getSupabaseAdmin();
        const row = {
          user_id: authUser.id,
          email: userEmail || authUser.email || null,
          analysis_json: unified,
          inputs_json: {
            source: "analyze-letter",
            has_file_url: !!fileUrl,
            has_image_url: !!imageUrl,
            text_length: letterText.length,
          },
          preview_snapshot,
          letter_full: unified.letter_full,
          preview_text: unified.preview.letter_visible.slice(0, 500),
          paid: false,
          is_unlocked: false,
        };

        let { data: insertData, error: insertError } = await supabase
          .from("tax_letter_jobs")
          .insert(row)
          .select("id, created_at")
          .single();

        if (
          insertError &&
          /preview_snapshot|column/i.test(String(insertError.message || insertError.details || ""))
        ) {
          delete row.preview_snapshot;
          ({ data: insertData, error: insertError } = await supabase
            .from("tax_letter_jobs")
            .insert(row)
            .select("id, created_at")
            .single());
        }

        if (insertError) throw insertError;
        recordId = insertData.id;
        console.log("Record saved:", recordId);
      } catch (dbError) {
        console.error("Database error:", dbError);
        trackError(dbError, { functionName: "analyze-letter", phase: "db_insert" });
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Could not save your session. Please try again." }),
        };
      }
    } else {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Database not configured" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        job_id: recordId,
        recordId,
        notice: unified.notice,
        risk: unified.risk,
        preview: unified.preview,
      }),
    };
  } catch (err) {
    console.error("[analyze-letter] handler error:", err && err.message, err && err.stack);
    trackError(err, {
      functionName: "analyze-letter",
    });
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: err.message || "Analysis failed",
      }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, "analyze-letter");
