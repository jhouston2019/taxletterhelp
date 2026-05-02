const OpenAI = require("openai");
const { getSupabaseAdmin } = require("./_supabase.js");
const { classifyIRSNotice, extractFinancialInfo } = require("./irs-intelligence/classification-engine.js");
const {
  generateIRSResponse,
  analyzeIRSLetter,
  TAX_DEFENSE_SYSTEM_PROMPT_BASE,
  formatNoticeFactsForPrompt
} = require("./irs-intelligence/index.js");
const { wrapHandler, trackError } = require('./_error-tracking.js');
const { getUserFromBearer } = require("./_request-auth.js");

const LETTER_GENERATION_MODEL = "gpt-4o";
const LETTER_GENERATION_MAX_TOKENS = 4000;
const LETTER_GENERATION_TEMPERATURE = 0.3;
const MIN_LETTER_LENGTH_FOR_SAVE = 200;

/** Retry OpenAI transient failures once; throws with second failure. */
async function createLetterCompletion(openai, completionParams) {
  try {
    return await openai.chat.completions.create(completionParams);
  } catch (firstErr) {
    console.warn("OpenAI completion failed, retrying once:", firstErr?.message || String(firstErr));
    return await openai.chat.completions.create(completionParams);
  }
}

function validateLetterBeforeSave(letter) {
  const s = typeof letter === "string" ? letter.trim() : "";
  if (s.length < MIN_LETTER_LENGTH_FOR_SAVE) {
    throw new Error("Invalid letter output");
  }
}

const LETTER_SAVE_SAFE_ERROR_BODY = JSON.stringify({
  error: "We couldn't generate a complete response. Please try again.",
});

const JSON_CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

/**
 * Persist letter_full when recordId is set; on validation or DB failure returns HTTP response (caller must return it).
 */
async function persistLetterFullOrSafeError(recordId, letter) {
  if (!recordId) return null;
  try {
    validateLetterBeforeSave(letter);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("tax_letter_jobs")
      .update({ letter_full: letter })
      .eq("id", recordId);
    if (error) throw error;
    return null;
  } catch (e) {
    trackError(e, {
      functionName: "generate-response",
      phase: "letter_full_save",
    });
    return {
      statusCode: 500,
      headers: JSON_CORS_HEADERS,
      body: LETTER_SAVE_SAFE_ERROR_BODY,
    };
  }
}

/** Master notice bucket — runs first on raw notice text (deterministic). */
function classifyNotice(noticeText) {
  const t = String(noticeText || "");
  if (/CP2000|underreporter/i.test(t)) return "CP2000";
  if (/1099-K/i.test(t)) return "1099K";
  if (/1099-NEC|1099-MISC/i.test(t)) return "1099NEC";
  if (/audit|examination/i.test(t)) return "AUDIT";
  if (/CP14|balance due/i.test(t)) return "BALANCE_DUE";
  if (/penalty/i.test(t)) return "PENALTY";
  return "GENERAL";
}

/**
 * Heuristic: every case resolves to one CORE_STRATEGY_TYPES label for the model.
 * Order is intentional (more specific patterns first).
 */
function inferCoreStrategyType(noticeText, userData) {
  const ud = userData && typeof userData === "object" && !Array.isArray(userData) ? userData : {};
  const strat = [ud.strategy, ud.customStrategy, ud.userPosition?.explanation].filter(Boolean).join(" ");
  const t = `${noticeText || ""}\n${strat}`.toLowerCase();

  if (/\bwrong\s+(taxpayer|recipient|tin|ssn)|misissued|not\s+my\s+(income|1099)|issued\s+in\s+error|incorrect\s+payee\b/i.test(t)) {
    return "Incorrect Attribution (wrong taxpayer)";
  }
  if (/\bduplicate|double\s+count|reported\s+twice|two\s+1099|overlap(ping)?\b/i.test(t)) {
    return "Duplicate Reporting";
  }
  if (/\balready\s+reported|on\s+(the\s+)?return|schedule\s+c|included\s+on|filed\s+.*return|matched\s+return\b/i.test(t)) {
    return "Income Already Reported";
  }
  if (/\btiming|different\s+year|accrual|deferr(ed|al)|year\s+of\s+inclusion\b/i.test(t)) {
    return "Timing Difference";
  }
  if (/\bbusiness\s+vs\.?\s*personal|personal\s+expense|misclassif|commingl|personal\s+use\b/i.test(t)) {
    return "Business vs Personal misclassification";
  }
  if (/\bbasis|cost\s+of\s+goods|cogs|cost\s+offset|unrecovered\s+cost|capital\s+recovery\b/i.test(t)) {
    return "Basis / cost offset missing";
  }
  if (/\breimburs|loan\s+proceeds|\bloan\b|gift\b|not\s+taxable|nontaxable|non-taxable|personal\s+transfer|pass-through\s+funds|returned\s+funds|refunds?\b/i.test(t)) {
    return "Income Not Taxable";
  }
  return "Data mismatch (third-party reporting error)";
}

/** Short positioning hint for POSITION section — must land clearly. */
function inferPositionStance(masterCode, coreType, noticeText) {
  const t = String(noticeText || "").toLowerCase();
  if (masterCode === "BALANCE_DUE") {
    if (/\bagree|pay\s+in\s+full|installment|payment\s+plan|hardship\b/i.test(t)) return "Partial agreement or payment intent (state which)";
    if (/\bdispute|incorrect|not\s+owed\b/i.test(t)) return "Dispute underlying liability";
    return "Clarification / reconciliation with payment intent if applicable";
  }
  if (masterCode === "AUDIT") return "Cooperative response — answer only what was asked; clarification / reconciliation";
  if (/\bpartial|partly|some\s+of|agree\s+with\s+part\b/i.test(t)) return "Partial agreement";
  if (/\bdispute|reject|incorrect|do\s+not\s+agree|challenge\b/i.test(t)) return "Dispute (full)";
  if (coreType === "Income Already Reported" || coreType === "Duplicate Reporting") {
    return "Clarification / reconciliation (no additional tax due)";
  }
  return "Clarification / reconciliation";
}

/** Issue routing for appended reasoning instructions (distinct order: 1099-K before CP2000). */
function classifyIssue(text) {
  const t = String(text || "");
  if (/1099-K/i.test(t)) return "1099K";
  if (/CP2000/i.test(t)) return "CP2000";
  if (/1099-NEC|1099-MISC/i.test(t)) return "1099NEC";
  if (/audit/i.test(t)) return "AUDIT";
  return "GENERAL";
}

function buildReasoningContext(fullText) {
  const issueType = classifyIssue(fullText);
  return `
Notice Type: ${issueType}

Apply the correct reasoning:
- 1099K → gross vs net income, reimbursements, transfers
- CP2000 → income mismatch, duplicate reporting, reconciliation
- 1099NEC → expense offsets, misclassification
- AUDIT → precise, documentation-focused response

Ensure the response reflects this reasoning structure.
`.trim();
}

function buildStrategyPlaybookHint(masterCode, coreType) {
  const lines = [];
  lines.push(`Master notice bucket: ${masterCode}. Primary strategy category: ${coreType}.`);
  if (masterCode === "CP2000") {
    lines.push(
      "CP2000: If income is real → reconcile and explain adjustments. If not taxable → classify source (transfer, reimbursement, loan, etc.). If duplicated → show overlap. If overstated → net/gross and characterization.",
      'High-impact (use only if fact-supported): third-party amounts may reflect gross transaction volume requiring characterization — not necessarily taxable income in full.'
    );
  } else if (masterCode === "1099K") {
    lines.push(
      "1099-K: Break down personal transfers, reimbursements, refunds, pass-through funds, and business revenue; taxable income is not the same as gross Form 1099-K volume.",
      'Strong position (facts only): Form 1099-K may reflect gross payment volume including non-income items (e.g., reimbursements, transfers, returned funds).'
    );
  } else if (masterCode === "1099NEC") {
    lines.push(
      "1099-NEC/MISC: Angles — already reported; wrong taxpayer; gross vs net after expenses; partial activity. Reporting mismatch ≠ underreporting if explained."
    );
  } else if (masterCode === "AUDIT") {
    lines.push(
      "Audit/exam: Answer only what is asked; clean index of documents; cooperative, precise tone; avoid volunteering extra exposure.",
      'Language pattern: "The taxpayer provides the following documentation and explanation responsive to the items identified in the examination notice."'
    );
  } else if (masterCode === "BALANCE_DUE") {
    lines.push(
      "Balance due: Not always a dispute — may be agreement + payment plan, hardship, or dispute of underlying tax. State payment intent where applicable."
    );
  } else if (masterCode === "PENALTY") {
    lines.push(
      "Penalty: Include reasonable-cause style facts if applicable — good faith, reliance on available information, no willful neglect. IRC §6664(c) may apply to certain penalties when reasonable cause is established; cite only if the fact pattern fits."
    );
  }
  lines.push(
    "Universal principles (selective, not all at once): IRC §61 defines gross income broadly but inflows must reflect actual economic gain; substance over form; taxpayer substantiates facts; third-party information returns are not alone determinative of tax liability."
  );
  return lines.join("\n");
}

/** AI core prompt (prepend to constrained intelligence prompt + legacy wizard). */
const AI_CORE_SYSTEM_PROMPT = `You are a senior U.S. tax controversy specialist experienced in IRS notices including CP2000, 1099-K discrepancies, audits, and penalty defenses.

Your task is to generate a formal IRS response letter that:

- Reads like it was written by a tax professional
- Uses precise, technical, and authoritative language
- Demonstrates clear understanding of the IRS notice
- Applies correct tax reasoning and principles
- Anticipates and addresses IRS objections

CRITICAL RULES:

1. Do NOT fabricate case law.
2. Only reference:
   - Internal Revenue Code (IRC)
   - Treasury Regulations
   - IRS guidance (when clearly applicable)
3. If a citation is uncertain, omit it.
4. Avoid generic or AI-like phrasing.

Your response must:

- Clearly explain the discrepancy
- Present a defensible tax position
- Reconcile IRS-reported amounts with actual figures
- Use structured, professional formatting
- Be persuasive but not aggressive

Write as if an IRS examiner is reviewing whether to accept or reject the taxpayer's position.

Maximize clarity, credibility, and acceptance likelihood.

The user message may include CLASSIFICATION_HINT with a deterministic notice-type tag and reasoning reminders — reconcile it with INPUT_JSON / notice facts; prioritize the substantive text.

STRUCTURE REQUIREMENT — Structure the response EXACTLY as:

INTRODUCTION

FACTUAL BACKGROUND

ISSUE IDENTIFICATION

LEGAL FRAMEWORK

ANALYSIS

POSITION

SUPPORTING DOCUMENTATION

CONCLUSION

ACTION CHECKLIST

Use a standard IRS submission letter framework (appropriate date/addressee, RE line, taxpayer identification placeholders where unknown).

Write primary body in first person from the signer to the IRS (I/my/me) unless constrained instructions say otherwise.

The ACTION CHECKLIST section must appear after CONCLUSION under the exact heading ACTION CHECKLIST (all caps acceptable). That section must clearly list concrete next steps the taxpayer should take (for example: gather or attach supporting documents; meet deadlines; mailing address and method; fax or IRS portal submissions if applicable; certified mail). Use numbered or bulleted steps so the taxpayer can follow them without interpreting the IRS letter alone.`;

function buildExpertInputJson(letterText, summary, userData) {
  let ud = {};
  try {
    ud = typeof userData === "string" ? JSON.parse(userData || "{}") : userData || {};
  } catch {
    ud = {};
  }
  const src = (letterText && String(letterText).trim()) ? letterText : (summary || "");
  const master_notice_code = classifyNotice(src);
  const legacyClassification = classifyIRSNotice(src);
  const legacyFinancial = extractFinancialInfo(src);
  const core_strategy_type = inferCoreStrategyType(src, ud);
  const position_stance_hint = inferPositionStance(master_notice_code, core_strategy_type, src);
  const strategy_playbook_hint = buildStrategyPlaybookHint(master_notice_code, core_strategy_type);

  const userBits = [
    ud.strategy ? `Strategy: ${ud.strategy}` : "",
    ud.customStrategy || "",
    ud.userPosition?.explanation ? String(ud.userPosition.explanation) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    notice_type: ud.noticeType || master_notice_code || legacyClassification?.noticeType || "Unknown",
    master_notice_code,
    tax_year: ud.taxYear != null && String(ud.taxYear).trim() ? String(ud.taxYear).trim() : legacyFinancial?.taxYear || "",
    taxpayer_name: "[TAXPAYER NAME]",
    summary_of_issue: (summary && String(summary).trim())
      ? String(summary).trim().slice(0, 8000)
      : legacyClassification?.description || "",
    extracted_financials: legacyFinancial,
    core_strategy_type,
    position_stance_hint,
    strategy_playbook_hint,
    user_explanation: userBits.slice(0, 4000) || "See taxpayer-provided information in the user message.",
    supporting_context: [
      legacyClassification?.description && `Legacy classification: ${legacyClassification.description}`,
      legacyClassification?.urgencyLevel && `Urgency: ${legacyClassification.urgencyLevel}`,
      `Master notice bucket: ${master_notice_code}`,
      `Core strategy: ${core_strategy_type}`,
      `Position stance hint: ${position_stance_hint}`,
    ]
      .filter(Boolean)
      .join(" | "),
  };
}

const mainHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  const { user: authUser } = await getUserFromBearer(event);
  if (!authUser) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: "Unauthorized" })
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

    if (recordId) {
      const supabase = getSupabaseAdmin();
      const { data: jobRow } = await supabase
        .from("tax_letter_jobs")
        .select("user_id")
        .eq("id", recordId)
        .maybeSingle();
      const uid = jobRow?.user_id ? String(jobRow.user_id) : null;
      if (!uid || uid !== String(authUser.id)) {
        return {
          statusCode: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }
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
        const expertUd = {
          ...(typeof userData === "object" && userData && !Array.isArray(userData) ? userData : {}),
          strategy: userData?.strategy || userPosition?.stance,
          customStrategy: userData?.customStrategy || userPosition?.explanation,
          userPosition,
        };
        const expertPayload = buildExpertInputJson(letterText, summary, expertUd);
        const reasoningContext = buildReasoningContext(
          [letterText, summary].filter((s) => s && String(s).trim()).join("\n\n")
        );
        const augmentedUser = `INPUT_JSON:\n${JSON.stringify(expertPayload, null, 2)}\n\nCLASSIFICATION_HINT:\n${reasoningContext}\n\n---\n\n${userPrompt}`;
        const completion = await createLetterCompletion(openai, {
          model: LETTER_GENERATION_MODEL,
          temperature: LETTER_GENERATION_TEMPERATURE,
          max_tokens: LETTER_GENERATION_MAX_TOKENS,
          messages: [
            {
              role: "system",
              content: `${AI_CORE_SYSTEM_PROMPT}\n\n---\n\n${systemPrompt}`,
            },
            { role: "user", content: augmentedUser },
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

      if (recordId) {
        const saveFail = await persistLetterFullOrSafeError(recordId, letter);
        if (saveFail) return saveFail;
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ success: true }),
      };
    }
    
    // Legacy / wizard path: structured INPUT_JSON + AI core + TAX_DEFENSE base rules
    console.log('Using legacy response generation (expert core + INPUT_JSON)');

    const legacySystemPrompt = `${TAX_DEFENSE_SYSTEM_PROMPT_BASE}

${AI_CORE_SYSTEM_PROMPT}

LEGACY / WIZARD PATH:
- The user message starts with INPUT_JSON, then CLASSIFICATION_HINT (routing + reasoning), then notice facts / full text below. Use every INPUT_JSON field and reconcile with notice text.
- Output the STRUCTURE REQUIREMENT headings in the AI_CORE_SYSTEM_PROMPT, then ACTION CHECKLIST.
- Obey PERSON/VOICE and HARD RULES from the base prompt: first person (I/my/me) to the IRS; no hedging where facts support a position; no banned phrases per base rules.
- Letter header block (mandatory): four lines before the IRS addressee when the base rules require it — [TAXPAYER NAME], [ADDRESS], [CITY, STATE, ZIP Code], [SSN/EIN: XXX-XX-XXXX]. Dates: Month DD, YYYY only (never ISO or numeric-only dates).
- STYLE HINTS (subordinate to legal accuracy — do not invent authority to satisfy tone):
  - Tone: ${tone}; approach: ${approach}; style: ${style}`;

    const expertPayload = buildExpertInputJson(letterText, summary, userData);
    const reasoningContext = buildReasoningContext(
      [letterText, summary].filter((s) => s && String(s).trim()).join("\n\n")
    );
    let legacyUserContent = `INPUT_JSON:\n${JSON.stringify(expertPayload, null, 2)}\n\nCLASSIFICATION_HINT:\n${reasoningContext}\n\n`;
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
    legacyUserContent += `Generate the complete IRS response per STRUCTURE REQUIREMENT in system prompt (sections through CONCLUSION), then ACTION CHECKLIST. Anchor every claim to INPUT_JSON, CLASSIFICATION_HINT, notice text, and taxpayer-provided information.`;

    const completion = await createLetterCompletion(openai, {
      model: LETTER_GENERATION_MODEL,
      temperature: LETTER_GENERATION_TEMPERATURE,
      max_tokens: LETTER_GENERATION_MAX_TOKENS,
      messages: [
        { role: "system", content: legacySystemPrompt },
        { role: "user", content: legacyUserContent }
      ],
    });

    const letter = completion.choices?.[0]?.message?.content?.trim() || "";

    if (recordId) {
      const saveFail = await persistLetterFullOrSafeError(recordId, letter);
      if (saveFail) return saveFail;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    trackError(error, {
      functionName: "generate-response",
      phase: "generate_response_outer",
    });
    console.error("Error in generate-response:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "We couldn't generate your response. Please try again.",
      }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, 'generate-response');
