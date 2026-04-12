const OpenAI = require("openai");
const { getSupabaseAdmin } = require("./_supabase.js");
const { classifyIRSNotice, extractFinancialInfo } = require("./irs-intelligence/classification-engine.js");
const {
  generateIRSResponse,
  analyzeIRSLetter,
  TAX_DEFENSE_SYSTEM_PROMPT_BASE,
  formatNoticeFactsForPrompt
} = require("./irs-intelligence/index.js");
const { wrapHandler, trackError, trackWarning } = require('./_error-tracking.js');

const LETTER_GENERATION_MODEL = "gpt-4o";
const LETTER_GENERATION_MAX_TOKENS = 4000;
const LETTER_GENERATION_TEMPERATURE = 0.3;

const mainHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const { 
      summary, 
      letterText = null,
      recordId = null, 
      tone = 'professional', 
      approach = 'cooperative', 
      style = 'detailed',
      userPosition = null,
      documents = [],
      userData = null
    } = JSON.parse(event.body || "{}");
    
    if (!summary && !letterText) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing summary or letter text" }) };
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // If we have the original letter text, use the full intelligence system
    if (letterText && userPosition) {
      console.log('Using IRS Response Intelligence System');
      
      // Step 1: Analyze the letter
      const analysisResult = await analyzeIRSLetter(letterText, {
        documents: documents,
        userContext: {
          userInput: userPosition.explanation,
          complexity: userPosition.complexity || "standard"
        }
      });
      
      // Step 2: Generate constrained AI response
      const aiGenerateFunction = async (systemPrompt, userPrompt) => {
        const completion = await openai.chat.completions.create({
          model: LETTER_GENERATION_MODEL,
          temperature: LETTER_GENERATION_TEMPERATURE,
          max_tokens: LETTER_GENERATION_MAX_TOKENS,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        });
        return completion.choices?.[0]?.message?.content?.trim() || "";
      };
      
      // Step 3: Generate response with full intelligence system
      const responseResult = await generateIRSResponse(
        analysisResult,
        userPosition,
        aiGenerateFunction,
        letterText
      );
      
      // Check for errors or warnings
      if (responseResult.error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: responseResult.message,
            allowedPositions: responseResult.allowedPositions
          })
        };
      }
      
      if (responseResult.warning) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            warning: true,
            message: responseResult.message,
            riskReport: responseResult.riskReport,
            recommendation: responseResult.recommendation
          })
        };
      }
      
      const letter = responseResult.responseLetter;
      
      // Update the existing record (if provided)
      if (recordId) {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
          .from("tlh_letters")
          .update({ 
            ai_response: letter, 
            status: "responded",
            risk_level: responseResult.metadata.riskLevel,
            requires_professional_review: responseResult.professionalReviewNeed.needsReview
          })
          .eq("id", recordId);
        if (error) console.error("Database update error:", error);
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          letter,
          riskAnalysis: responseResult.riskAnalysis,
          professionalReviewNeed: responseResult.professionalReviewNeed,
          attachmentInstructions: responseResult.attachmentInstructions,
          metadata: responseResult.metadata
        }),
      };
    }
    
    // Fallback: legacy path (e.g. upload flow without structured userPosition) — full sections 1–6 in one response
    console.log('Using legacy response generation with enhanced prompting');

    // Letter system prompt: TAX_DEFENSE_SYSTEM_PROMPT_BASE includes closing, dollar-decimal, and IRS-address rules (irs-intelligence/index.js LETTER_SYSTEM_PROMPT_ENFORCEMENT).
    const legacySystemPrompt = `${TAX_DEFENSE_SYSTEM_PROMPT_BASE}

OUTPUT SCOPE FOR THIS REQUEST (LEGACY PATH — SECTIONS 5 AND 6 ONLY):
Do NOT output sections 1–4 (Notice Summary, Issue Breakdown, Risk Assessment, Defense Strategy). Those topics are already covered by the separate notice analysis. Output ONLY the following two sections, in order, using these exact headings:

5. Response Letter
6. Action Checklist

Section 5 (Response Letter) must be a complete, standalone, submission-ready letter — not a summary or outline. It must comply with all HARD RULES in the system prompt: seasoned tax attorney (25 years), authoritative and assertive voice, zero hedging, no banned phrases, active voice preferred, opening paragraph states the taxpayer's position immediately, body has minimum 5 substantive paragraphs each advancing the defense with factual rebuttal and IRC citations where applicable, closing states exactly what action the IRS must take (no "I look forward", no thanks-for-consideration). Section 5 must strictly obey PERSON/VOICE RULES above: written by the taxpayer to the IRS, first person (I/my/me) only in every sentence of that section; never "the taxpayer", "the filer", or "they" for the signer. Placeholders only where taxpayer-specific facts are unknown.

Section 5 letter header (mandatory): The taxpayer address block must always include exactly four separate lines, in order — never skip city/state/zip: [TAXPAYER NAME], [ADDRESS], [CITY, STATE, ZIP Code], [SSN/EIN: XXX-XX-XXXX]. Dates anywhere in the letter must be written as Month DD, YYYY (for example March 16, 2026); never ISO (YYYY-MM-DD) or numeric (MM/DD/YYYY).

Section 6 must be a concrete action checklist (documents, mailing, deadlines, submission method). Do not repeat analysis from sections 1–4.

MANDATORY OVERRIDE — STYLE PREFERENCES ARE SUBORDINATE:
The following preferences must NOT weaken, soften, or hedge the letter. If they conflict with HARD RULES, ignore the preference in favor of the mandatory authoritative voice.
- Requested tone label: ${tone}
- Requested approach label: ${approach}
- Requested style label: ${style}`;

    let legacyUserContent = '';
    if (letterText) {
      const legacyClassification = classifyIRSNotice(letterText);
      const legacyFinancial = extractFinancialInfo(letterText);
      legacyUserContent += formatNoticeFactsForPrompt(legacyClassification, legacyFinancial, letterText);
    } else if (summary) {
      const legacyClassification = classifyIRSNotice(summary);
      const legacyFinancial = extractFinancialInfo(summary);
      legacyUserContent += formatNoticeFactsForPrompt(legacyClassification, legacyFinancial, summary);
    }
    legacyUserContent += `Follow the system instructions. Anchor every section to the notice and amounts below.\n\n`;
    if (letterText) {
      legacyUserContent += `FULL NOTICE TEXT:\n${letterText}\n\n`;
    } else if (summary) {
      legacyUserContent += `NOTICE / ANALYSIS TEXT (primary context):\n${summary}\n\n`;
    }
    if (summary) {
      legacyUserContent += `SUPPLEMENTAL ANALYSIS (if any):\n${summary}\n\n`;
    }
    if (userData) {
      const ud = typeof userData === 'string' ? userData : JSON.stringify(userData, null, 2);
      legacyUserContent += `TAXPAYER-PROVIDED INFORMATION:\n${ud}\n\n`;
      try {
        const udObj = typeof userData === 'string' ? JSON.parse(userData) : userData;
        if (udObj && udObj.taxYear && String(udObj.taxYear).trim()) {
          legacyUserContent += `AUTHORITATIVE TAX YEAR FOR THE LETTER (use in RE line / [TAX YEAR] placeholders): ${String(udObj.taxYear).trim()}\n\n`;
        }
      } catch (_) { /* ignore malformed userData */ }
    }
    legacyUserContent += `Generate only sections 5 and 6 (Response Letter and Action Checklist) as specified in the system message — no sections 1–4.`;

    const completion = await openai.chat.completions.create({
      model: LETTER_GENERATION_MODEL,
      temperature: LETTER_GENERATION_TEMPERATURE,
      max_tokens: LETTER_GENERATION_MAX_TOKENS,
      messages: [
        { role: "system", content: legacySystemPrompt },
        { role: "user", content: legacyUserContent }
      ],
    });

    const letter = completion.choices?.[0]?.message?.content?.trim() || "";

    // Update the existing record (if provided)
    if (recordId) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("tlh_letters")
        .update({ ai_response: letter, status: "responded" })
        .eq("id", recordId);
      if (error) console.error("Database update error:", error);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ letter }),
    };
  } catch (error) {
    trackError(error, { 
      functionName: 'generate-response',
      hasLetterText: !!letterText,
      hasUserPosition: !!userPosition
    });
    console.error("Error in generate-response:", error);
    return { 
      statusCode: 500, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message }) 
    };
  }
};

exports.handler = wrapHandler(mainHandler, 'generate-response');