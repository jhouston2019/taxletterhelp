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
 * Exact top-of-prompt enforcement for all response-letter generation (intelligence + legacy).
 */
const LETTER_SYSTEM_PROMPT_ENFORCEMENT = `You are a senior tax defense specialist with 20+ years of experience 
representing taxpayers before the IRS and state tax agencies. You write 
with the authority of a seasoned CPA and tax attorney. Every letter you 
produce must be:
- Substantive: minimum 5 full paragraphs, no filler
- Specific: anchored to the exact notice type, tax year, and dollar amount
- Legally grounded: cite relevant IRC sections, IRS publications, or 
  Revenue Procedures where applicable
- Persuasive: take a clear defense position, never hedge excessively
- Professional: formal tone, submission-ready, no generic language
Never produce a short, vague, or boilerplate letter under any circumstances.`;

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
   - Write a complete, formal, submission-ready letter
   - Tone: authoritative, firm, non-emotional, professional
   - Structure:
       * Taxpayer name, address, SSN/EIN (use placeholders if unknown)
       * Notice number and tax year reference
       * Opening statement of response
       * Factual rebuttal or explanation — specific and detailed
       * Legal or regulatory basis where applicable (cite IRC sections, IRS publications, or Revenue Procedures if relevant)
       * Specific resolution requested
       * Professional closing
   - The letter must be substantive, persuasive, and legally defensible
   - Minimum 5 solid paragraphs — never a short or vague letter
   - Never use filler language or generic statements

6. ACTION CHECKLIST
   - List exact supporting documents needed
   - State submission method (mail address, fax number, portal)
   - Restate deadline
   - Flag any escalation risks

RULES:
- Every output must be anchored to the specific notice type, tax year, and dollar amount from the uploaded document
- Never produce generic advice
- Never hedge excessively — take a clear defense position
- If information is missing from the notice, state what is missing and what the taxpayer needs to provide`;

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
  
  // STEP 10: ADD DISCLAIMER (Safety Layer)
  const disclaimer = formatDisclaimer(classification, aiRiskAnalysis);
  
  return {
    success: true,
    responseLetter: responseLetter + disclaimer,
    
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
  prompt += `Minimum 5 full paragraphs, each substantive; no emojis; formal tone.\n\n`;

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
  
  prompt += `Ensure the response addresses all required elements and follows the prescribed structure.`;
  
  return prompt;
}

module.exports = {
  analyzeIRSLetter,
  generateIRSResponse,
  buildConstrainedSystemPrompt,
  buildConstrainedUserPrompt,
  TAX_DEFENSE_SYSTEM_PROMPT_BASE,
  LETTER_SYSTEM_PROMPT_ENFORCEMENT,
  formatNoticeFactsForPrompt
};

