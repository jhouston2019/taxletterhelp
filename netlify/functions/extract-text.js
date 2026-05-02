import Busboy from "busboy";
import pdf from "pdf-parse";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizeHeaders(headers) {
  const out = {};
  if (!headers || typeof headers !== "object") return out;
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "string") out[k.toLowerCase()] = v;
  }
  return out;
}

/** Netlify may send `body` as a UTF-8 string or base64 depending on `isBase64Encoded`. */
function bodyBuffer(event) {
  if (event.body == null || event.body === "") return Buffer.alloc(0);
  if (event.isBase64Encoded) return Buffer.from(event.body, "base64");
  if (Buffer.isBuffer(event.body)) return event.body;
  return Buffer.from(String(event.body), "utf8");
}

function bufferLooksLikePdf(buf) {
  if (!buf || buf.length < 5) return false;
  return buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

export async function handler(event) {
  try {
    console.log("FUNCTION HIT");
    console.log("HEADERS:", event.headers);
    console.log("BODY LENGTH:", event.body?.length);
    console.log("isBase64Encoded:", event.isBase64Encoded);

    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: CORS,
        body: "Method Not Allowed",
      };
    }

    const headersNorm = normalizeHeaders(event.headers);
    const contentType = headersNorm["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ error: "Invalid content type" }),
      };
    }

    const busboy = Busboy({
      headers: headersNorm,
    });

    let fileBuffer = null;
    let mimeType = "";
    let tookFile = false;

    await new Promise((resolve, reject) => {
      busboy.on("file", (fieldname, file, info) => {
        if (tookFile) {
          file.resume();
          return;
        }
        tookFile = true;
        const chunks = [];
        mimeType = (info?.mimeType || "").toLowerCase();

        file.on("data", (data) => {
          chunks.push(data);
        });
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
        });
        file.on("error", reject);
      });

      busboy.on("finish", resolve);
      busboy.on("error", reject);

      busboy.end(bodyBuffer(event));
    });

    if (!fileBuffer || !fileBuffer.length) {
      throw new Error("No file received");
    }

    console.log("FILE SIZE:", fileBuffer.length);

    let text = "";

    const declaredPdf =
      mimeType === "application/pdf" || (mimeType && mimeType.includes("pdf"));

    if (bufferLooksLikePdf(fileBuffer) || declaredPdf) {
      const parsed = await pdf(fileBuffer).catch((err) => {
        console.error("PDF PARSE ERROR:", err);
        throw new Error("PDF parsing failed");
      });
      text = (parsed.text || "").trim();
    } else if (mimeType.startsWith("image/")) {
      if (!process.env.OPENAI_API_KEY) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", ...CORS },
          body: JSON.stringify({ error: "Image extraction is not configured (missing OPENAI_API_KEY)." }),
        };
      }
      const b64 = fileBuffer.toString("base64");
      const extractInstruction =
        "Extract all text from this file. Return only the text content, preserving the original formatting and structure where reasonable. Do not add commentary or analysis.";
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractInstruction },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType || "image/png"};base64,${b64}` },
              },
            ],
          },
        ],
        max_tokens: 4000,
      });
      text = (response.choices[0]?.message?.content || "").trim();
    } else {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({
          error: `Unsupported file type: ${mimeType || "unknown"}. Upload a PDF or image.`,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({
        text,
      }),
    };
  } catch (err) {
    console.error("EXTRACT ERROR:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({
        error: err.message || "Extraction failed",
      }),
    };
  }
}
