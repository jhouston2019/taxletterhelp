/**
 * IRS RESPONSE INTELLIGENCE SYSTEM - MAIN INTEGRATION
 * 
 * This module integrates all intelligence components to transform
 * Tax Letter Help from generic AI into IRS-specific decision intelligence.
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
 * @returns {Object} Complete response package
 */
async function generateIRSResponse(analysisResult, userPosition, aiGenerateFunction) {
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
  const userPrompt = buildConstrainedUserPrompt(userPosition, evidenceMap, playbook);
  
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
  let prompt = `You are an IRS tax correspondence specialist writing a response to a ${classification.noticeType} (${classification.description}).\n\n`;
  
  prompt += `REQUIRED TONE: ${playbook.requiredTone}\n\n`;
  
  prompt += `REQUIRED ELEMENTS (You MUST include all of these):\n`;
  playbook.requiredElements.forEach(element => {
    prompt += `- ${element}\n`;
  });
  prompt += `\n`;
  
  prompt += `PROHIBITED LANGUAGE (You MUST NOT use any of these phrases):\n`;
  playbook.prohibitedLanguage.forEach(phrase => {
    prompt += `- "${phrase}"\n`;
  });
  prompt += `\n`;
  
  prompt += `RESPONSE STRUCTURE:\n`;
  Object.entries(playbook.responseStructure).forEach(([section, requirement]) => {
    prompt += `${section.toUpperCase()}: ${requirement}\n`;
  });
  prompt += `\n`;
  
  prompt += `CRITICAL WARNINGS TO INCORPORATE:\n`;
  playbook.criticalWarnings.forEach(warning => {
    prompt += `- ${warning}\n`;
  });
  prompt += `\n`;
  
  prompt += `DEADLINE: ${deadlineIntelligence.deadline.daysRemaining} days remaining. `;
  prompt += `Urgency: ${deadlineIntelligence.deadline.urgencyLevel}\n\n`;
  
  prompt += `Write a professional, IRS-compliant response letter that follows all requirements above. `;
  prompt += `Do NOT use emojis. Do NOT use conversational language. Use formal business correspondence style.\n\n`;
  
  prompt += `Focus on facts, not emotions. Be specific and direct. Reference the notice number and date. `;
  prompt += `State the taxpayer's position clearly and support it with facts.`;
  
  return prompt;
}

/**
 * Builds constrained user prompt for AI generation
 * @param {Object} userPosition - User's position
 * @param {Object} evidenceMap - Evidence mapping
 * @param {Object} playbook - Notice-specific playbook
 * @returns {string} User prompt
 */
function buildConstrainedUserPrompt(userPosition, evidenceMap, playbook) {
  let prompt = `Write a response letter with the following information:\n\n`;
  
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
  buildConstrainedUserPrompt
};

