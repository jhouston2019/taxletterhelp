/**
 * IRS RESPONSE INTELLIGENCE SYSTEM - MAIN INTEGRATION
 * 
 * This module integrates all intelligence components to transform
 * Tax Letter Defense Pro from generic AI into IRS-specific decision intelligence.
 * 
 * WHY THIS TOOL IS SAFER THAN GENERAL AI:
 * 
 * 1. DETERMINISTIC CLASSIFICATION: Notice types are identified through pattern
 *    matching, not AI hallucination. This ensures consistent, reliable identification.
 * 
 * 2. PROCEDURAL CONSTRAINTS: AI generation is constrained by IRS-specific playbooks
 *    that enforce proper procedures, required elements, and prohibited language.
 * 
 * 3. RISK GUARDRAILS: All user input and AI output is analyzed for dangerous
 *    admissions, over-disclosure, and legal misstatements before being presented.
 * 
 * 4. EVIDENCE INTELLIGENCE: Documents are mapped to specific claims with explicit
 *    guidance on what to attach vs. exclude, preventing harmful over-disclosure.
 * 
 * 5. DEADLINE AWARENESS: Exact escalation timelines and consequences are calculated
 *    and communicated, not left to AI interpretation.
 * 
 * WHERE LOGIC OVERRIDES AI:
 * 
 * - Notice classification (deterministic pattern matching)
 * - Deadline calculations (mathematical, not estimated)
 * - Escalation sequences (predefined by IRS procedures)
 * - Risk detection (rule-based pattern matching)
 * - Professional help thresholds (objective criteria)
 * 
 * WHERE AI IS DELIBERATELY CONSTRAINED:
 * 
 * - System prompt includes IRS procedural rules
 * - Context includes notice-specific playbook
 * - Output must conform to structured format
 * - Prohibited language is filtered out
 * - Response must address required elements
 * 
 * This architecture ensures the tool provides materially better outcomes than
 * general AI by embedding domain expertise, procedural knowledge, and safety controls.
 */

const { classifyIRSNotice, extractDeadlineInfo, extractFinancialInfo } = require('./classification-engine');
const { getPlaybook, validateUserPosition, checkProhibitedLanguage, assessProfessionalHelpNeed } = require('./response-playbooks');
const { generateDeadlineIntelligence } = require('./deadline-calculator');
const { mapEvidence, generateAttachmentInstructions, validateEvidence } = require('./evidence-mapper');
const { analyzeRisks, assessProfessionalReviewNeed, sanitizeText, generateRiskReport } = require('./risk-guardrails');
const { formatAnalysisOutput, formatResponseLetter, formatDisclaimer } = require('./output-formatter');

/**
 * First-person taxpayer voice — shared by intelligence and legacy letter generation (see generate-response.js).
 */
const LETTER_PERSON_VOICE_RULES = `PERSON/VOICE RULES — CRITICAL:
- The letter is written BY the taxpayer TO the IRS
- Always write in FIRST PERSON: "I", "my", "me"
- NEVER use third person: "the taxpayer", "the filer", "they"
- Wrong: "The taxpayer disputes the proposed balance"
- Right: "I dispute the proposed balance"
- Wrong: "The taxpayer's return accurately reflects"
- Right: "My return accurately reflects"
- Wrong: "The taxpayer demands that the IRS"
- Right: "I demand that the IRS"
- Wrong: "The taxpayer requests"
- Right: "I hereby request" or "I demand"

This is a hard rule. Every sentence in the response letter section must use first person. No exceptions.`;

/**
 * Exact top-of-prompt enforcement for all response-letter generation (intelligence + legacy).
 */
const LETTER_SYSTEM_PROMPT_ENFORCEMENT = `You are a seasoned tax attorney with 25 years of experience representing taxpayers before the IRS and state tax agencies. You write as that attorney would: with commanding authority, not as a tentative advisor.

MANDATORY TONE (HARD RULES — VIOLATING THESE INVALIDATES THE OUTPUT):
- Authoritative and assertive at all times. Never hedge with "may", "might", "could perhaps", "I believe", "it appears", "potentially", "suggests", "might indicate", or any similar tentative, speculative, or wishy-washy phrasing.
- Every sentence must be declarative, confident, and grounded in fact or cited authority.
- Prefer active voice whenever an actor is clear (taxpayer, IRS, documentation, return). Do not use passive voice when active voice states the same point more directly.
- No filler, no courtesy padding: never write "I appreciate your attention", "I look forward to your prompt response", "Thank you for your consideration", "please feel free to contact me", "I hope", or any variation of "I look forward to".

${LETTER_PERSON_VOICE_RULES}

PHRASES YOU MUST NEVER USE (exactly or in close paraphrase):
- "I believe there may be"
- "may have led to"
- "it appears"
- "appears to"
- "potentially indicating"
- "they believe may indicate"
- "the IRS may proceed"
- "which may indicate"
- "suggesting potential"
- "could indicate"
- "seems to"
- "it is possible"
- "there may be"
- "I hope"
- "I appreciate"
- "Thank you for your consideration"
- Any variation of "I look forward to"
- "please feel free to contact me"

HEDGING BAN: Replace all tentative or speculative phrasing with direct assertions. The IRS either has a valid claim or it does not — state which, without "may", "might", "appears", "suggests", or possibility language.

USE ASSERTIVE FRAMING SUCH AS (adapt to the facts; first person for the taxpayer per PERSON/VOICE RULES):
- "The IRS's assessment is incorrect because..."
- "The documentation establishes that..."
- "My return accurately reflects..."
- "The IRS has failed to account for..."
- "Pursuant to IRC Section [cite the applicable section], I am entitled to..."

SUBSTANCE (HARD RULES):
- Minimum 5 substantive paragraphs in the response letter body (excluding salutation/address block if present); each paragraph must advance the defense — no filler, no repetition for length.
- Specific: anchor every material point to the exact notice type, tax year, and dollar amounts from the notice.
- Legally grounded: cite IRC sections, IRS publications, or Revenue Procedures where applicable; integrate citations into declarative sentences.

Never produce a short, vague, or boilerplate letter under any circumstances.

LETTER FORMAT (HARD RULES — CLOSING, AMOUNTS, IRS ADDRESS):
- CLOSING SIGNATURE: The closing must be "Sincerely," followed by one blank line and [TAXPAYER NAME] once. Never add a second [Taxpayer Printed Name], [Printed Name], or any duplicate printed-name line below the signature; the single name line after "Sincerely," is sufficient.
- DOLLAR AMOUNTS: Always format dollar amounts with exactly two decimal places (e.g. $990.20, never $990.2).
- IRS ADDRESS BLOCK: The IRS address block must use exactly:
  Internal Revenue Service
  [IRS Address]
  [IRS City, State, ZIP]
  Use [IRS Address] and [IRS City, State, ZIP] as separate placeholders — never use the taxpayer's city, state, or ZIP for the IRS address block.
- TAXPAYER MAILING HEADER: The taxpayer address block at the top of the letter must always include four consecutive lines on separate lines — never skip the city/state/zip line. Use these exact placeholders:
  [TAXPAYER NAME]
  [ADDRESS]
  [CITY, STATE, ZIP Code]
  [SSN/EIN: XXX-XX-XXXX]
- DATES: Always format dates as Month DD, YYYY (for example March 16, 2026). Never use ISO format (YYYY-MM-DD) or numeric format (MM/DD/YYYY).`;

/**
 * Extended framework after enforcement (used in full system prompts).
 */
const TAX_DEFENSE_FRAMEWORK_SECTIONS = `When analyzing a tax notice, you must:

1. NOTICE SUMMARY
   - Identify the exact notice type (CP2000, CP14, LT11, audit, etc.)
   - State the tax year(s) at issue
   - State the exact dollar amount claimed or disputed
   - Identify the IRS's specific legal or factual claim
   - State the response deadline

2. ISSUE BREAKDOWN
   - Explain in plain English exactly what the IRS is claiming and why
   - Identify any factual errors, unsupported assumptions, or procedural defects in the IRS position
   - State clearly what triggered the notice

3. RISK ASSESSMENT
   - Assign a risk level: Low / Medium / High / Critical
   - Justify the risk level with specific facts from the notice
   - State consequences of non-response

4. DEFENSE STRATEGY
   - Select the correct path: dispute / agree and resolve / documentation response / penalty abatement / payment plan
   - State the legal or factual basis for the chosen strategy
   - Be specific — never generic

5. RESPONSE LETTER
   - Write a complete, formal, submission-ready letter in the voice of a 25-year tax attorney: declarative, confident, zero hedging (see HARD RULES above). The signer is the taxpayer: every sentence in this section must be first person (I/my/me) to the IRS — see PERSON/VOICE RULES.
   - Structure (mandatory):
       * Taxpayer mailing header: four lines only for that block — [TAXPAYER NAME], [ADDRESS], [CITY, STATE, ZIP Code], [SSN/EIN: XXX-XX-XXXX] (each on its own line; never omit city/state/zip); then contact lines if needed; all letter dates as Month DD, YYYY
       * Notice number and tax year reference
       * Opening paragraph: immediately and definitively state the taxpayer's position — no preamble, thanks, or throat-clearing
       * Body: minimum 5 substantive paragraphs; each paragraph advances the defense with factual rebuttal and, where applicable, specific IRC (or other authority) citations woven into assertive sentences
       * Closing paragraph: state exactly what action the IRS must take (e.g., abate, reverse, accept enclosed documentation, correct the account) — no pleasantries, no "I look forward", no "thank you for your consideration"
   - Factual rebuttal must be specific and detailed; every paragraph must earn its place
   - The letter must be persuasive and legally defensible without relying on passive or tentative language
   - Never use filler language, generic statements, or soft closings

6. ACTION CHECKLIST
   - List exact supporting documents needed
   - State submission method (mail address, fax number, portal)
   - Restate deadline
   - Flag any escalation risks

RULES:
- Every output must be anchored to the specific notice type, tax year, and dollar amount from the uploaded document
- Never produce generic advice
- Never hedge: take a clear defense position using the mandatory authoritative voice; banned phrases and softeners listed in HARD RULES are forbidden
- If information is missing from the notice, state what is missing and what the taxpayer needs to provide — in declarative sentences, not speculative ones`;

const TAX_DEFENSE_SYSTEM_PROMPT_BASE = `${LETTER_SYSTEM_PROMPT_ENFORCEMENT}\n\n${TAX_DEFENSE_FRAMEWORK_SECTIONS}`;

/**
 * Tax year(s) heuristic from notice text for user-prompt anchoring.
 * @param {string} letterText
 * @returns {string}
 */
function extractTaxYearsFromLetter(letterText) {
  if (!letterText || !letterText.trim()) return 'Not extracted — infer from NOTICE TEXT below.';
  const found = new Set();
  const re = /\b(20[0-9]{2}|19[89][0-9])\b/g;
  let m;
  while ((m = re.exec(letterText)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 1990 && y <= 2100) found.add(m[1]);
  }
  return found.size ? [...found].sort().join(', ') : 'Not extracted — infer from NOTICE TEXT below.';
}

/**
 * Structured facts for user prompts (intelligence + legacy).
 * @param {Object|null} classification - from classifyIRSNotice
 * @param {Object|null} financialInfo - from extractFinancialInfo
 * @param {string} letterText
 * @returns {string}
 */
function formatNoticeFactsForPrompt(classification, financialInfo, letterText) {
  const noticeType = classification && classification.noticeType
    ? `${classification.noticeType} — ${classification.description || ''}`.trim()
    : 'Unknown — infer from NOTICE TEXT below.';
  const taxYears = extractTaxYearsFromLetter(letterText);
  const parts = [];
  if (financialInfo) {
    if (financialInfo.balanceDue != null && !Number.isNaN(financialInfo.balanceDue)) {
      parts.push(`Balance due: $${Number(financialInfo.balanceDue).toLocaleString('en-US')}`);
    }
    if (financialInfo.proposedChange != null && !Number.isNaN(financialInfo.proposedChange)) {
      parts.push(`Proposed change: $${Number(financialInfo.proposedChange).toLocaleString('en-US')}`);
    }
    if (financialInfo.largestAmount != null && !Number.isNaN(financialInfo.largestAmount)) {
      parts.push(`Largest amount detected in text: $${Number(financialInfo.largestAmount).toLocaleString('en-US')}`);
    }
  }
  const dollarLine = parts.length ? parts.join(' | ') : 'Not auto-extracted — use dollar amounts in NOTICE TEXT below.';

  return `PARSED NOTICE FACTS (anchor your output to these; reconcile with the full notice text):\n` +
    `- Notice type: ${noticeType}\n` +
    `- Tax year(s): ${taxYears}\n` +
    `- Dollar amount(s) at issue: ${dollarLine}\n\n`;
}

/**
 * Main function: Analyzes IRS letter with full intelligence system
 * @param {string} letterText - Raw text from IRS letter
 * @param {Object} options - Optional parameters
 * @returns {Object} Complete analysis with all intelligence components
 */
async function analyzeIRSLetter(letterText, options = {}) {
  const {
    documents = [],
    userContext = {}
  } = options;
  
  // STEP 1: DETERMINISTIC CLASSIFICATION (Logic Override)
  const classification = classifyIRSNotice(letterText);
  const deadlineInfo = extractDeadlineInfo(letterText);
  const financialInfo = extractFinancialInfo(letterText);
  
  // STEP 2: GET NOTICE-SPECIFIC PLAYBOOK (Constraint System)
  const playbook = getPlaybook(classification.noticeType);
  
  // STEP 3: CALCULATE DEADLINE INTELLIGENCE (Logic Override)
  const deadlineIntelligence = generateDeadlineIntelligence(classification, deadlineInfo);
  
  // STEP 4: MAP EVIDENCE (If documents provided)
  let evidenceMap = null;
  let evidenceValidation = null;
  if (documents && documents.length > 0) {
    evidenceMap = mapEvidence(documents, classification, playbook);
    evidenceValidation = validateEvidence(evidenceMap, playbook);
  }
  
  // STEP 5: ASSESS PROFESSIONAL HELP NEED (Logic Override)
  const professionalHelpAssessment = assessProfessionalHelpNeed(
    classification.noticeType,
    financialInfo.balanceDue || financialInfo.largestAmount || 0,
    userContext.complexity || "standard"
  );
  
  // STEP 6: ANALYZE RISKS (if user input provided)
  let riskAnalysis = null;
  let professionalReviewNeed = null;
  if (userContext.userInput) {
    riskAnalysis = analyzeRisks(userContext.userInput, classification);
    professionalReviewNeed = assessProfessionalReviewNeed(
      riskAnalysis,
      classification,
      financialInfo.balanceDue || 0
    );
  }
  
  // STEP 7: FORMAT STRUCTURED OUTPUT (Constraint System)
  const analysisOutput = formatAnalysisOutput({
    classification,
    deadlineIntelligence,
    financialInfo,
    riskAnalysis,
    professionalHelpAssessment
  });
  
  // STEP 8: ADD DISCLAIMER (Safety Layer)
  const disclaimer = formatDisclaimer(classification, riskAnalysis);
  
  return {
    // Core Intelligence
    classification,
    playbook,
    deadlineIntelligence,
    financialInfo,
    
    // Evidence Analysis
    evidenceMap,
    evidenceValidation,
    
    // Risk Assessment
    riskAnalysis,
    professionalHelpAssessment,
    professionalReviewNeed,
    
    // Formatted Output
    analysisOutput: analysisOutput + disclaimer,
    
    // Metadata
    metadata: {
      analysisDate: new Date().toISOString(),
      systemVersion: "1.0.0",
      confidenceLevel: classification.confidence,
      requiresProfessionalHelp: professionalHelpAssessment.recommendProfessional,
      riskLevel: riskAnalysis ? riskAnalysis.overallRisk : "UNKNOWN"
    }
  };
}

/**
 * Generates IRS response letter with full intelligence system
 * @param {Object} analysisResult - Result from analyzeIRSLetter
 * @param {Object} userPosition - User's position and input
 * @param {Function} aiGenerateFunction - AI generation function (constrained)
 * @param {string} letterText - Original notice text (for user prompt anchoring)
 * @returns {Object} Complete response package
 */
async function generateIRSResponse(analysisResult, userPosition, aiGenerateFunction, letterText = '') {
  const {
    classification,
    playbook,
    deadlineIntelligence,
    evidenceMap
  } = analysisResult;
  
  // STEP 1: VALIDATE USER POSITION (Constraint System)
  const positionValidation = validateUserPosition(classification.noticeType, userPosition.stance);
  
  if (!positionValidation.valid) {
    return {
      error: true,
      message: positionValidation.message,
      allowedPositions: positionValidation.allowedPositions
    };
  }
  
  // STEP 2: CHECK FOR PROHIBITED LANGUAGE (Safety Layer)
  const prohibitedCheck = checkProhibitedLanguage(userPosition.explanation || "", classification.noticeType);
  
  if (prohibitedCheck.hasProhibitedLanguage) {
    return {
      warning: true,
      message: "Your explanation contains language that could harm your case",
      flaggedPhrases: prohibitedCheck.flaggedPhrases,
      recommendation: "Please revise your explanation to avoid these phrases"
    };
  }
  
  // STEP 3: ANALYZE RISKS IN USER INPUT (Safety Layer)
  const riskAnalysis = analyzeRisks(userPosition.explanation || "", classification);
  
  if (riskAnalysis.overallRisk === "CRITICAL" || riskAnalysis.overallRisk === "HIGH") {
    const riskReport = generateRiskReport(riskAnalysis, {
      needsReview: true,
      urgency: "HIGH",
      reasons: ["User input contains risky language"]
    });
    
    return {
      warning: true,
      message: "Your explanation contains statements that could increase your risk",
      riskReport: riskReport,
      recommendation: "Please review and revise your explanation, or consult a tax professional"
    };
  }
  
  // STEP 4: BUILD CONSTRAINED AI PROMPT (Constraint System)
  const systemPrompt = buildConstrainedSystemPrompt(classification, playbook, deadlineIntelligence);
  const userPrompt = buildConstrainedUserPrompt(
    userPosition,
    evidenceMap,
    playbook,
    letterText,
    classification,
    analysisResult.financialInfo
  );
  
  // STEP 5: GENERATE AI CONTENT (AI Layer - Constrained)
  const aiContent = await aiGenerateFunction(systemPrompt, userPrompt);
  
  // STEP 6: ANALYZE AI OUTPUT FOR RISKS (Safety Layer)
  const aiRiskAnalysis = analyzeRisks(aiContent, classification);
  
  // STEP 7: SANITIZE IF NECESSARY (Safety Layer)
  let finalContent = aiContent;
  let sanitizationReport = null;
  
  if (aiRiskAnalysis.overallRisk === "CRITICAL" || aiRiskAnalysis.overallRisk === "HIGH") {
    const sanitized = sanitizeText(aiContent, aiRiskAnalysis);
    finalContent = sanitized.sanitizedText;
    sanitizationReport = sanitized;
  }
  
  // STEP 8: FORMAT RESPONSE LETTER (Constraint System)
  const responseLetter = formatResponseLetter({
    classification,
    playbook,
    userPosition,
    evidenceMap,
    aiGeneratedContent: finalContent,
    deadlineIntelligence
  });
  
  // STEP 9: FINAL PROFESSIONAL REVIEW ASSESSMENT (Logic Override)
  const professionalReviewNeed = assessProfessionalReviewNeed(
    aiRiskAnalysis,
    classification,
    analysisResult.financialInfo.balanceDue || 0
  );
  
  // Disclaimer is not appended to the response letter body (exports stay clean for PDF/DOCX).

  return {
    success: true,
    responseLetter,
    
    // Safety Information
    riskAnalysis: aiRiskAnalysis,
    sanitizationReport,
    professionalReviewNeed,
    
    // Evidence Guidance
    attachmentInstructions: evidenceMap ? 
      generateAttachmentInstructions(evidenceMap, classification.noticeType) : 
      null,
    
    // Metadata
    metadata: {
      generationDate: new Date().toISOString(),
      noticeType: classification.noticeType,
      userPosition: userPosition.stance,
      riskLevel: aiRiskAnalysis.overallRisk,
      requiresReview: professionalReviewNeed.needsReview
    }
  };
}

/**
 * Builds constrained system prompt for AI generation
 * @param {Object} classification - Notice classification
 * @param {Object} playbook - Notice-specific playbook
 * @param {Object} deadlineIntelligence - Deadline intelligence
 * @returns {string} System prompt
 */
function buildConstrainedSystemPrompt(classification, playbook, deadlineIntelligence) {
  let prompt = TAX_DEFENSE_SYSTEM_PROMPT_BASE;

  prompt += `\n\nOUTPUT SCOPE FOR THIS REQUEST (INTELLIGENCE PATH — LETTER BODY ONLY):\n`;
  prompt += `Output only the letter body that belongs after the salutation in formatResponseLetter(): substantive paragraphs only (no duplicate "Dear Sir or Madam:", no separate valediction or signature block — the wrapper supplies those). `;
  prompt += `Do not output numbered sections 1–4 or section 6; weave any necessary context into the body. `;
  prompt += `Minimum 5 full substantive paragraphs in the body; opening states the taxpayer's position immediately in first person (I/my/me); closing states the exact IRS action required; no emojis; enforce HARD RULES and PERSON/VOICE RULES (no hedging, no banned phrases, active voice preferred, assertive attorney voice, every sentence first person as the taxpayer to the IRS).\n\n`;

  prompt += `CLASSIFIED NOTICE CONTEXT (anchor the letter to this plus the user message; reconcile with the actual notice text):\n`;
  prompt += `- Notice type: ${classification.noticeType} — ${classification.description}\n`;
  prompt += `- Days remaining (system estimate): ${deadlineIntelligence.deadline.daysRemaining}; Urgency: ${deadlineIntelligence.deadline.urgencyLevel}\n\n`;

  prompt += `PLAYBOOK — REQUIRED TONE: ${playbook.requiredTone}\n\n`;

  prompt += `PLAYBOOK — REQUIRED ELEMENTS (you MUST reflect these in the letter body):\n`;
  playbook.requiredElements.forEach(element => {
    prompt += `- ${element}\n`;
  });
  prompt += `\n`;

  prompt += `PLAYBOOK — PROHIBITED LANGUAGE (do not use):\n`;
  playbook.prohibitedLanguage.forEach(phrase => {
    prompt += `- "${phrase}"\n`;
  });
  prompt += `\n`;

  prompt += `PLAYBOOK — RESPONSE STRUCTURE (cover these themes in your paragraphs):\n`;
  Object.entries(playbook.responseStructure).forEach(([section, requirement]) => {
    prompt += `${section.toUpperCase()}: ${requirement}\n`;
  });
  prompt += `\n`;

  prompt += `PLAYBOOK — CRITICAL WARNINGS (incorporate where applicable):\n`;
  playbook.criticalWarnings.forEach(warning => {
    prompt += `- ${warning}\n`;
  });
  prompt += `\n`;

  return prompt;
}

/**
 * Builds constrained user prompt for AI generation
 * @param {Object} userPosition - User's position
 * @param {Object} evidenceMap - Evidence mapping
 * @param {Object} playbook - Notice-specific playbook
 * @param {string} letterText - Full notice text for factual anchoring
 * @param {Object} classification - Parsed notice classification
 * @param {Object} financialInfo - Parsed financial fields
 * @returns {string} User prompt
 */
function buildConstrainedUserPrompt(
  userPosition,
  evidenceMap,
  playbook,
  letterText = '',
  classification = null,
  financialInfo = null
) {
  let prompt = formatNoticeFactsForPrompt(classification, financialInfo, letterText);
  if (letterText && letterText.trim()) {
    prompt += `FULL NOTICE TEXT:\n${letterText.trim()}\n\n`;
  }
  prompt += `Write a response letter with the following information:\n\n`;
  
  prompt += `TAXPAYER POSITION: ${userPosition.stance}\n\n`;
  
  if (userPosition.explanation) {
    prompt += `EXPLANATION: ${userPosition.explanation}\n\n`;
  }
  
  if (evidenceMap && evidenceMap.toAttach.length > 0) {
    prompt += `SUPPORTING DOCUMENTS:\n`;
    evidenceMap.toAttach.forEach((item, index) => {
      prompt += `${index + 1}. ${item.document.name} - ${item.supports}\n`;
    });
    prompt += `\n`;
  }
  
  if (userPosition.requestedAction) {
    prompt += `REQUESTED ACTION: ${userPosition.requestedAction}\n\n`;
  }
  
  prompt += `Ensure the response addresses all required elements, follows the prescribed structure, and strictly obeys the HARD RULES and PERSON/VOICE RULES: authoritative 25-year tax attorney voice, no hedging or banned phrases, minimum 5 substantive body paragraphs with IRC citations where applicable, opening states the taxpayer position immediately in first person (I/my/me), closing mandates the exact IRS action, no third person for the taxpayer ("the taxpayer", "they", etc.).`;
  
  return prompt;
}

module.exports = {
  analyzeIRSLetter,
  generateIRSResponse,
  buildConstrainedSystemPrompt,
  buildConstrainedUserPrompt,
  TAX_DEFENSE_SYSTEM_PROMPT_BASE,
  LETTER_SYSTEM_PROMPT_ENFORCEMENT,
  LETTER_PERSON_VOICE_RULES,
  formatNoticeFactsForPrompt
};

