// CORE INTELLIGENCE — DO NOT MODIFY WITHOUT TEST SUITE
/**
 * RISK & ADMISSION GUARDRAILS
 * 
 * Purpose: Safety layer that prevents dangerous admissions, over-disclosure,
 * and legal misstatements in IRS correspondence.
 * 
 * Why this is safer than general AI:
 * - Pattern matching detects 50+ dangerous phrases
 * - Safety scoring (0-100) quantifies risk
 * - Blocks admissions of fault before generation
 * - Prevents over-disclosure of sensitive information
 * 
 * Where logic overrides AI:
 * - Risk pattern detection (regex matching)
 * - Safety score calculation (rule-based)
 * - Admission identification (pattern matching)
 * - Professional review triggers (objective thresholds)
 */

/**
 * Analyzes text for risky language and admissions
 * @param {string} text - Text to analyze (user input or AI-generated response)
 * @param {Object} classification - Notice classification
 * @returns {Object} Risk analysis with flagged issues and safer alternatives
 */
function analyzeRisks(text, classification) {
  const risks = {
    admissionsOfFault: [],
    overDisclosure: [],
    legalMisstatements: [],
    aggressiveLanguage: [],
    volunteeringInfo: [],
    safetyScore: 100,
    overallRisk: "LOW"
  };
  
  const textLower = text.toLowerCase();
  
  // Check for admissions of fault
  const faultPatterns = [
    { pattern: /i (didn't|did not) (report|include|file)/gi, risk: "HIGH", issue: "Admission of non-reporting" },
    { pattern: /i (forgot|overlooked|missed)/gi, risk: "MEDIUM", issue: "Admission of negligence" },
    { pattern: /i (knew|know) (i|it) (was|is) wrong/gi, risk: "CRITICAL", issue: "Admission of willful violation" },
    { pattern: /i (intentionally|deliberately|purposely)/gi, risk: "CRITICAL", issue: "Admission of intent" },
    { pattern: /i (tried to|attempted to) (hide|conceal|avoid)/gi, risk: "CRITICAL", issue: "Admission of evasion" },
    { pattern: /i didn't think (it mattered|i needed to|anyone would notice)/gi, risk: "HIGH", issue: "Admission of disregard" },
    { pattern: /i (lied|falsified|made up)/gi, risk: "CRITICAL", issue: "Admission of fraud" },
    { pattern: /i was (lazy|careless|sloppy)/gi, risk: "MEDIUM", issue: "Admission of negligence" },
    { pattern: /i didn't keep (records|receipts|documentation)/gi, risk: "MEDIUM", issue: "Admission of poor recordkeeping" },
    { pattern: /i (guessed|estimated) (the|my) (amount|income|deduction)/gi, risk: "HIGH", issue: "Admission of inaccuracy" }
  ];
  
  faultPatterns.forEach(({ pattern, risk, issue }) => {
    const matches = text.match(pattern);
    if (matches) {
      risks.admissionsOfFault.push({
        text: matches[0],
        risk: risk,
        issue: issue,
        saferAlternative: generateSaferAlternative(matches[0], issue)
      });
      risks.safetyScore -= (risk === "CRITICAL" ? 30 : risk === "HIGH" ? 20 : 10);
    }
  });
  
  // Check for over-disclosure
  const overDisclosurePatterns = [
    { pattern: /in (prior|previous|other) (years|tax years)/gi, risk: "HIGH", issue: "Volunteering information about other years" },
    { pattern: /(also|additionally|furthermore).*(didn't|did not) (report|file|include)/gi, risk: "HIGH", issue: "Volunteering additional violations" },
    { pattern: /i (have|had) (other|additional) (income|deductions|issues)/gi, risk: "HIGH", issue: "Volunteering unreported items" },
    { pattern: /my (spouse|partner|business partner) (also|too)/gi, risk: "MEDIUM", issue: "Implicating others" },
    { pattern: /here (is|are) (all|my) (bank statements|financial records)/gi, risk: "HIGH", issue: "Providing excessive documentation" },
    { pattern: /i (also|additionally) want to mention/gi, risk: "MEDIUM", issue: "Volunteering information" }
  ];
  
  overDisclosurePatterns.forEach(({ pattern, risk, issue }) => {
    const matches = text.match(pattern);
    if (matches) {
      risks.overDisclosure.push({
        text: matches[0],
        risk: risk,
        issue: issue,
        warning: "This statement volunteers information beyond the scope of the notice"
      });
      risks.safetyScore -= (risk === "HIGH" ? 20 : 10);
    }
  });
  
  // Check for legal misstatements
  const legalMisstatements = [
    { pattern: /i (have|had) (a|the) right to/gi, risk: "MEDIUM", issue: "Potential misstatement of legal rights" },
    { pattern: /the (law|irs|tax code) (says|states|requires)/gi, risk: "MEDIUM", issue: "Potential misstatement of law" },
    { pattern: /this is (illegal|unconstitutional|invalid)/gi, risk: "HIGH", issue: "Legal argument without basis" },
    { pattern: /i (am not|refuse to) (pay|comply)/gi, risk: "CRITICAL", issue: "Statement of non-compliance" },
    { pattern: /you (can't|cannot) (do this|make me|force me)/gi, risk: "HIGH", issue: "Confrontational legal statement" },
    { pattern: /i (declare|claim) (bankruptcy|insolvency)/gi, risk: "HIGH", issue: "Legal status claim without proper filing" }
  ];
  
  legalMisstatements.forEach(({ pattern, risk, issue }) => {
    const matches = text.match(pattern);
    if (matches) {
      risks.legalMisstatements.push({
        text: matches[0],
        risk: risk,
        issue: issue,
        warning: "This statement may be legally incorrect or confrontational"
      });
      risks.safetyScore -= (risk === "CRITICAL" ? 30 : risk === "HIGH" ? 20 : 10);
    }
  });
  
  // Check for aggressive or confrontational language
  const aggressivePatterns = [
    { pattern: /this is (ridiculous|absurd|outrageous|harassment)/gi, risk: "MEDIUM", issue: "Confrontational tone" },
    { pattern: /(you are|you're|irs is) (wrong|mistaken|incompetent|corrupt)/gi, risk: "HIGH", issue: "Accusatory language" },
    { pattern: /i (demand|insist|require) (that you|the irs)/gi, risk: "MEDIUM", issue: "Aggressive tone" },
    { pattern: /i will (sue|file a complaint|report you|contact my congressman)/gi, risk: "HIGH", issue: "Threatening language" },
    { pattern: /(never|don't) (contact|call|write) me (again|anymore)/gi, risk: "HIGH", issue: "Refusing communication" }
  ];
  
  aggressivePatterns.forEach(({ pattern, risk, issue }) => {
    const matches = text.match(pattern);
    if (matches) {
      risks.aggressiveLanguage.push({
        text: matches[0],
        risk: risk,
        issue: issue,
        warning: "This language may harm your case and antagonize IRS personnel"
      });
      risks.safetyScore -= (risk === "HIGH" ? 15 : 10);
    }
  });
  
  // Check for volunteering future information
  const volunteeringPatterns = [
    { pattern: /i (will|plan to|intend to) (file|report|pay) (next year|in the future|going forward)/gi, risk: "LOW", issue: "Volunteering future intentions" },
    { pattern: /i (promise|guarantee|commit) to/gi, risk: "MEDIUM", issue: "Making binding commitments" },
    { pattern: /from now on/gi, risk: "LOW", issue: "Implying past non-compliance" }
  ];
  
  volunteeringPatterns.forEach(({ pattern, risk, issue }) => {
    const matches = text.match(pattern);
    if (matches) {
      risks.volunteeringInfo.push({
        text: matches[0],
        risk: risk,
        issue: issue,
        warning: "Avoid making promises or volunteering information about future actions"
      });
      risks.safetyScore -= (risk === "MEDIUM" ? 10 : 5);
    }
  });
  
  // Calculate overall risk level
  if (risks.safetyScore >= 80) {
    risks.overallRisk = "LOW";
  } else if (risks.safetyScore >= 60) {
    risks.overallRisk = "MEDIUM";
  } else if (risks.safetyScore >= 40) {
    risks.overallRisk = "HIGH";
  } else {
    risks.overallRisk = "CRITICAL";
  }
  
  return risks;
}

/**
 * Generates safer alternative phrasing for risky statements
 * @param {string} riskyText - The risky text
 * @param {string} issue - The identified issue
 * @returns {string} Safer alternative phrasing
 */
function generateSaferAlternative(riskyText, issue) {
  const alternatives = {
    "Admission of non-reporting": "Upon review of the notice, I have identified a discrepancy that requires clarification.",
    "Admission of negligence": "After careful review of my records, I have determined the following information is relevant.",
    "Admission of willful violation": "I respectfully disagree with the proposed assessment for the following reasons.",
    "Admission of intent": "The facts and circumstances are as follows.",
    "Admission of evasion": "I am providing the following documentation to support my position.",
    "Admission of disregard": "I have reviewed the notice and am responding as follows.",
    "Admission of fraud": "I dispute the proposed changes based on the following facts.",
    "Admission of poor recordkeeping": "I am providing the available documentation to support my position.",
    "Admission of inaccuracy": "Based on my records, the correct amount is as follows."
  };
  
  return alternatives[issue] || "Please rephrase to state facts without admitting fault.";
}

/**
 * Checks if response requires professional review before sending
 * @param {Object} riskAnalysis - Risk analysis result
 * @param {Object} classification - Notice classification
 * @param {number} amount - Dollar amount involved
 * @returns {Object} Professional review recommendation
 */
function assessProfessionalReviewNeed(riskAnalysis, classification, amount) {
  const { overallRisk, safetyScore, admissionsOfFault } = riskAnalysis;
  const { noticeType } = classification;
  
  let needsReview = false;
  let urgency = "OPTIONAL";
  let reasons = [];
  
  // Critical risk factors
  if (overallRisk === "CRITICAL" || safetyScore < 40) {
    needsReview = true;
    urgency = "MANDATORY";
    reasons.push("Response contains critical risk factors that could severely harm your case");
  }
  
  // High-risk admissions
  const criticalAdmissions = admissionsOfFault.filter(a => a.risk === "CRITICAL");
  if (criticalAdmissions.length > 0) {
    needsReview = true;
    urgency = "MANDATORY";
    reasons.push("Response contains admissions that could expose you to fraud penalties or criminal liability");
  }
  
  // High-risk notice types
  const highRiskNotices = ["CP504", "CP75", "AUDIT_LETTER", "LETTER_1058"];
  if (highRiskNotices.includes(noticeType)) {
    needsReview = true;
    urgency = urgency === "MANDATORY" ? "MANDATORY" : "STRONGLY_RECOMMENDED";
    reasons.push(`${noticeType} notices carry serious consequences and should be reviewed by a professional`);
  }
  
  // Large dollar amounts
  if (amount > 25000) {
    needsReview = true;
    urgency = urgency === "MANDATORY" ? "MANDATORY" : "STRONGLY_RECOMMENDED";
    reasons.push("Amount involved exceeds $25,000 - professional review recommended");
  }
  
  // Multiple risk categories
  const riskCategories = [
    riskAnalysis.admissionsOfFault.length,
    riskAnalysis.overDisclosure.length,
    riskAnalysis.legalMisstatements.length,
    riskAnalysis.aggressiveLanguage.length
  ].filter(count => count > 0).length;
  
  if (riskCategories >= 3) {
    needsReview = true;
    urgency = urgency === "MANDATORY" ? "MANDATORY" : "STRONGLY_RECOMMENDED";
    reasons.push("Response contains multiple categories of risk factors");
  }
  
  return {
    needsReview: needsReview,
    urgency: urgency,
    reasons: reasons,
    recommendation: urgency === "MANDATORY" ?
      "⚠️ CRITICAL: Do not send this response without professional review. It contains statements that could seriously harm your case." :
      urgency === "STRONGLY_RECOMMENDED" ?
      "⚠️ WARNING: Professional review is strongly recommended before sending this response." :
      "Professional review is optional but may be beneficial."
  };
}

/**
 * Sanitizes text by removing or flagging risky content
 * @param {string} text - Text to sanitize
 * @param {Object} riskAnalysis - Risk analysis result
 * @returns {Object} Sanitized text and list of changes
 */
function sanitizeText(text, riskAnalysis) {
  let sanitized = text;
  const changes = [];
  
  // Remove critical admissions
  const criticalIssues = [
    ...riskAnalysis.admissionsOfFault.filter(a => a.risk === "CRITICAL"),
    ...riskAnalysis.legalMisstatements.filter(a => a.risk === "CRITICAL")
  ];
  
  criticalIssues.forEach(issue => {
    if (sanitized.includes(issue.text)) {
      sanitized = sanitized.replace(issue.text, `[REMOVED: ${issue.issue}]`);
      changes.push({
        removed: issue.text,
        reason: issue.issue,
        suggestion: issue.saferAlternative || "Rephrase to state facts without admission"
      });
    }
  });
  
  // Flag high-risk issues for review
  const highRiskIssues = [
    ...riskAnalysis.admissionsOfFault.filter(a => a.risk === "HIGH"),
    ...riskAnalysis.overDisclosure.filter(a => a.risk === "HIGH"),
    ...riskAnalysis.legalMisstatements.filter(a => a.risk === "HIGH"),
    ...riskAnalysis.aggressiveLanguage.filter(a => a.risk === "HIGH")
  ];
  
  highRiskIssues.forEach(issue => {
    changes.push({
      flagged: issue.text,
      reason: issue.issue,
      warning: issue.warning || "This statement should be reviewed and potentially revised"
    });
  });
  
  return {
    sanitizedText: sanitized,
    changes: changes,
    changeCount: changes.length,
    requiresReview: changes.length > 0
  };
}

/**
 * Generates risk report for user review
 * @param {Object} riskAnalysis - Risk analysis result
 * @param {Object} professionalReview - Professional review assessment
 * @returns {string} Formatted risk report
 */
function generateRiskReport(riskAnalysis, professionalReview) {
  let report = "=== RISK ANALYSIS REPORT ===\n\n";
  
  report += `Safety Score: ${riskAnalysis.safetyScore}/100\n`;
  report += `Overall Risk Level: ${riskAnalysis.overallRisk}\n\n`;
  
  if (riskAnalysis.admissionsOfFault.length > 0) {
    report += "⚠️ ADMISSIONS OF FAULT:\n";
    riskAnalysis.admissionsOfFault.forEach((item, index) => {
      report += `${index + 1}. "${item.text}"\n`;
      report += `   Risk: ${item.risk} - ${item.issue}\n`;
      report += `   Safer Alternative: "${item.saferAlternative}"\n\n`;
    });
  }
  
  if (riskAnalysis.overDisclosure.length > 0) {
    report += "⚠️ OVER-DISCLOSURE:\n";
    riskAnalysis.overDisclosure.forEach((item, index) => {
      report += `${index + 1}. "${item.text}"\n`;
      report += `   ${item.warning}\n\n`;
    });
  }
  
  if (riskAnalysis.legalMisstatements.length > 0) {
    report += "⚠️ LEGAL MISSTATEMENTS:\n";
    riskAnalysis.legalMisstatements.forEach((item, index) => {
      report += `${index + 1}. "${item.text}"\n`;
      report += `   ${item.warning}\n\n`;
    });
  }
  
  if (riskAnalysis.aggressiveLanguage.length > 0) {
    report += "⚠️ AGGRESSIVE LANGUAGE:\n";
    riskAnalysis.aggressiveLanguage.forEach((item, index) => {
      report += `${index + 1}. "${item.text}"\n`;
      report += `   ${item.warning}\n\n`;
    });
  }
  
  if (professionalReview.needsReview) {
    report += "\n" + professionalReview.recommendation + "\n\n";
    report += "Reasons:\n";
    professionalReview.reasons.forEach((reason, index) => {
      report += `${index + 1}. ${reason}\n`;
    });
  }
  
  return report;
}

module.exports = {
  analyzeRisks,
  generateSaferAlternative,
  assessProfessionalReviewNeed,
  sanitizeText,
  generateRiskReport
};

