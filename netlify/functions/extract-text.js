import { createRequire } from "module";
import OpenAI from "openai";

const require = createRequire(import.meta.url);
const { getRequestIp, checkIpRateLimit } = require("./_rate-limit-ip.js");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** OpenAI-backed extraction — per-IP cap (default 20 / 15 min). */
const extractMax = () =>
  Math.max(3, Math.min(200, parseInt(process.env.RATE_LIMIT_EXTRACT_PER_IP, 10) || 20));
const EXTRACT_WINDOW_MS = 15 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const ip = getRequestIp(event);
  const extractRl = checkIpRateLimit(ip, {
    namespace: "extract-text",
    maxRequests: extractMax(),
    windowMs: EXTRACT_WINDOW_MS,
  });
  if (!extractRl.ok) {
    return {
      statusCode: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(extractRl.retryAfterSec),
        ...CORS,
      },
      body: JSON.stringify({
        error: "Too many file extractions. Please try again in a few minutes.",
      }),
    };
  }

  try {
    const { imageData, mimeType } = JSON.parse(event.body || "{}");
    if (!imageData) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS },
        body: JSON.stringify({ error: "Missing imageData (base64 payload)" }),
      };
    }

    const type = (mimeType || "image/png").toLowerCase();
    const extractInstruction =
      "Extract all text from this file. Return only the text content, preserving the original formatting and structure where reasonable. Do not add commentary or analysis.";

    let extractedText;

    if (type === "application/pdf" || type.includes("pdf")) {
      if (typeof client.responses?.create !== "function") {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json", ...CORS },
          body: JSON.stringify({
            error: "PDF extraction requires a newer OpenAI SDK with Responses API (openai ^4.77).",
          }),
        };
      }

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: extractInstruction },
              {
                type: "input_file",
                filename: "document.pdf",
                file_data: `data:application/pdf;base64,${imageData}`,
              },
            ],
          },
        ],
      });
      extractedText = (response.output_text || "").trim();
    } else {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractInstruction },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType || "image/png"};base64,${imageData}` },
              },
            ],
          },
        ],
        max_tokens: 4000,
      });
      extractedText = (response.choices[0]?.message?.content || "").trim();
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ text: extractedText }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({
        error: "Failed to extract text",
        details: error.message,
      }),
    };
  }
}
