import OpenAI from "openai";
import fetch from "node-fetch";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import Tesseract from "tesseract.js";
import { getSupabaseAdmin } from "./_supabase.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handler = async (event) => {
  try {
    const { text, fileUrl, imageUrl, userEmail = null, priceId = process.env.STRIPE_PRICE_RESPONSE, stripeSessionId = null } = JSON.parse(event.body || "{}");
    let letterText = text || "";

    // --- STEP 1: Extract text from file if provided ---
    if (fileUrl) {
      try {
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
        }
        const fileBuffer = await fileResponse.arrayBuffer();
        const uint8 = new Uint8Array(fileBuffer);

        if (fileUrl.endsWith(".pdf")) {
          const parsed = await pdfParse(uint8);
          letterText += "\n\n" + parsed.text;
        } else if (fileUrl.endsWith(".doc") || fileUrl.endsWith(".docx")) {
          const { value } = await mammoth.extractRawText({ buffer: Buffer.from(uint8) });
          letterText += "\n\n" + value;
        }
      } catch (fileError) {
        console.error("File processing error:", fileError);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Failed to process file: ${fileError.message}` }),
        };
      }
    }

    // --- STEP 2: Extract text from image if provided ---
    if (imageUrl) {
      try {
        const { data: { text: extractedText } } = await Tesseract.recognize(imageUrl, "eng");
        letterText += "\n\n" + extractedText;
      } catch (imageError) {
        console.error("Image processing error:", imageError);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Failed to process image: ${imageError.message}` }),
        };
      }
    }

    if (!letterText.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No text provided or extracted from files." }),
      };
    }

    // --- STEP 3: Analyze the letter using OpenAI ---
    const systemPrompt = `
      You are a professional IRS correspondence analyst with 20+ years of experience.
      Analyze this IRS letter and provide a comprehensive response in the following JSON format:
      
      {
        "letterType": "Type of notice (e.g., CP2000, CP2001, 1099-K, Audit Notice, etc.)",
        "summary": "Plain English explanation of what this letter means",
        "reason": "Why the taxpayer received this letter",
        "requiredActions": "What the taxpayer needs to do and by when",
        "nextSteps": "Recommended response actions",
        "confidence": 85,
        "urgency": "High/Medium/Low",
        "estimatedResolution": "Timeframe for resolution"
      }
      
      Be specific about deadlines, amounts, and required documentation. 
      Provide actionable advice that helps the taxpayer understand their situation clearly.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: letterText },
      ],
      temperature: 0.4,
    });

    const aiResponse = completion.choices?.[0]?.message?.content || "No response generated.";
    
    // Calculate confidence score based on token usage
    const confidenceScore = Math.round(Math.max(60, Math.min(95, (1 - (completion.usage?.completion_tokens || 0) / 2048) * 100)));
    
    // Try to parse the AI response as JSON, fallback to plain text
    let structuredAnalysis;
    try {
      structuredAnalysis = JSON.parse(aiResponse);
      structuredAnalysis.confidence = confidenceScore;
    } catch {
      structuredAnalysis = {
        letterType: "Unknown",
        summary: aiResponse,
        reason: "Unable to parse structured response",
        requiredActions: "Review the summary for details",
        nextSteps: "Consider consulting a tax professional",
        confidence: confidenceScore,
        urgency: "Medium",
        estimatedResolution: "Varies"
      };
    }

    // --- STEP 4: Store in Supabase ---
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("tlh_letters")
        .insert({
          user_email: userEmail,
          stripe_session_id: stripeSessionId,
          price_id: priceId,
          letter_text: letterText,
          analysis: structuredAnalysis,
          summary: structuredAnalysis.summary || aiResponse,
          status: "analyzed"
        })
        .select("id, created_at, status")
        .single();

      if (error) throw error;

      // --- STEP 5: Return structured response ---
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          message: "Analysis complete.",
          analysis: structuredAnalysis,
          recordId: data.id,
          summary: structuredAnalysis.summary || aiResponse
        }),
      };
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Return analysis even if database fails
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          message: "Analysis complete (database error occurred).",
          analysis: structuredAnalysis,
          summary: structuredAnalysis.summary || aiResponse
        }),
      };
    }
  } catch (err) {
    console.error("Error in analyze-letter.js:", err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};