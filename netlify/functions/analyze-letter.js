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
      You are a senior IRS Taxpayer Advocate with 25+ years of experience specializing in:
      - CP2000, CP2001, CP2002, CP2003 notices (Proposed Assessments)
      - 1099-K, 1099-MISC, 1099-NEC discrepancies
      - Audit notices (CP75, CP2001, Letter 2205)
      - Underpayment penalties (CP14, CP15, CP16)
      - Identity verification (5071C, 5747C, 4883C)
      - Math error notices (CP2002, CP2003)
      - Balance due notices (CP14, CP15, CP16, CP161)
      - Refund holds and offsets (CP53, CP54, CP55)
      
      Current IRS procedures as of 2024:
      - Most notices have 30-day response deadlines
      - Online response options available at irs.gov
      - Payment plans available for most balances
      - Penalty abatement possible for reasonable cause
      - Identity verification can be done online
      - Most correspondence can be handled without visiting an office
      
      Analyze this IRS letter with expert-level knowledge and provide a comprehensive response in the following JSON format:
      
      {
        "letterType": "Specific notice type (e.g., CP2000, CP2001, 1099-K, Audit Notice, etc.)",
        "summary": "Plain English explanation of what this letter means and its implications",
        "reason": "Detailed explanation of why the taxpayer received this letter",
        "requiredActions": "Specific actions needed, deadlines, and required documentation",
        "nextSteps": "Step-by-step recommended response actions with priorities",
        "confidence": 85,
        "urgency": "High/Medium/Low based on deadlines and amounts",
        "estimatedResolution": "Realistic timeframe for resolution",
        "penaltyRisk": "Potential penalties if not addressed",
        "paymentOptions": "Available payment methods and plans",
        "appealRights": "Information about appeal rights and procedures"
      }
      
      Be extremely specific about:
      - Exact deadlines and response requirements
      - Dollar amounts and calculations
      - Required supporting documentation
      - Online vs. mail response options
      - Penalty implications and abatement possibilities
      - Payment plan options and requirements
      
      Provide actionable, expert-level advice that helps the taxpayer understand their situation clearly and take appropriate action.
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
    
    // Notice type recognition patterns
    const noticeTypePatterns = {
      'CP2000': /CP2000|Proposed Assessment.*Income/i,
      'CP2001': /CP2001|Proposed Assessment.*Additional Tax/i,
      'CP2002': /CP2002|Math Error/i,
      'CP2003': /CP2003|Math Error.*Additional/i,
      'CP14': /CP14|Balance Due/i,
      'CP15': /CP15|Balance Due.*Final/i,
      'CP16': /CP16|Balance Due.*Notice/i,
      'CP75': /CP75|Audit|Examination/i,
      'CP161': /CP161|Balance Due.*Final/i,
      '1099-K': /1099-K|Payment Card|Third Party Network/i,
      '1099-MISC': /1099-MISC|Miscellaneous Income/i,
      '1099-NEC': /1099-NEC|Nonemployee Compensation/i,
      '5071C': /5071C|Identity Verification/i,
      '5747C': /5747C|Identity Verification/i,
      '4883C': /4883C|Identity Verification/i,
      'CP53': /CP53|Refund Hold/i,
      'CP54': /CP54|Refund Offset/i,
      'CP55': /CP55|Refund Offset/i
    };

    // Detect notice type from letter text
    let detectedNoticeType = "Unknown";
    for (const [type, pattern] of Object.entries(noticeTypePatterns)) {
      if (pattern.test(letterText)) {
        detectedNoticeType = type;
        break;
      }
    }

    // Try to parse the AI response as JSON, fallback to plain text
    let structuredAnalysis;
    try {
      structuredAnalysis = JSON.parse(aiResponse);
      structuredAnalysis.confidence = confidenceScore;
      
      // Override with detected notice type if more specific
      if (detectedNoticeType !== "Unknown" && structuredAnalysis.letterType === "Unknown") {
        structuredAnalysis.letterType = detectedNoticeType;
      }
      
      // Add additional fields if missing
      if (!structuredAnalysis.penaltyRisk) {
        structuredAnalysis.penaltyRisk = "Review notice for specific penalty information";
      }
      if (!structuredAnalysis.paymentOptions) {
        structuredAnalysis.paymentOptions = "Contact IRS for payment plan options";
      }
      if (!structuredAnalysis.appealRights) {
        structuredAnalysis.appealRights = "You have the right to appeal within 30 days";
      }
      
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      structuredAnalysis = {
        letterType: detectedNoticeType,
        summary: aiResponse,
        reason: "Unable to parse structured response",
        requiredActions: "Review the summary for details",
        nextSteps: "Consider consulting a tax professional",
        confidence: Math.max(60, confidenceScore - 10), // Lower confidence for parse errors
        urgency: "Medium",
        estimatedResolution: "Varies",
        penaltyRisk: "Review notice for specific penalty information",
        paymentOptions: "Contact IRS for payment plan options",
        appealRights: "You have the right to appeal within 30 days"
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