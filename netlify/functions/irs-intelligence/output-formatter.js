// CORE INTELLIGENCE — DO NOT MODIFY WITHOUT TEST SUITE
/**
 * STRUCTURED OUTPUT FORMATTER
 * 
 * Purpose: Enforces procedural, risk-aware output for IRS correspondence.
 * Directive language only. No educational content. No chat behavior.
 * 
 * Design principles:
 * - Action-oriented (not explanatory)
 * - Procedurally constrained (not conversational)
 * - Risk-aware (not friendly)
 * - Decisive (not suggestive)
 */

/**
 * Formats complete analysis output with all required sections
 * @param {Object} params - All analysis components
 * @returns {string} Formatted output text
 */
function formatAnalysisOutput(params) {
  const {
    classification,
    deadlineIntelligence,
    financialInfo,
    riskAnalysis,
    professionalHelpAssessment
  } = params;
  
  let output = "";
  
  // Section 1: What This IRS Notice Means
  output += formatSection1_NoticeExplanation(classification, financialInfo);
  
  // Section 2: Your Required Action
  output += formatSection2_RequiredAction(classification, deadlineIntelligence);
  
  // Section 3: Your Best Response Strategy
  output += formatSection3_ResponseStrategy(classification, deadlineIntelligence);
  
  // Section 4: What Happens Next (Timeline)
  output += formatSection4_Timeline(deadlineIntelligence);
  
  // Section 5: Risk Assessment
  if (riskAnalysis && riskAnalysis.overallRisk !== "LOW") {
    output += formatSection5_RiskAssessment(riskAnalysis);
  }
  
  // Section 6: When Professional Help Becomes Necessary
  output += formatSection6_ProfessionalHelp(professionalHelpAssessment, classification, financialInfo);
  
  return output;
}

/**
 * Section 1: What This IRS Notice Means
 */
function formatSection1_NoticeExplanation(classification, financialInfo) {
  let section = "═══════════════════════════════════════════════════════════════\n";
  section += "NOTICE CLASSIFICATION\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  section += `Notice Type: ${classification.noticeType}\n`;
  section += `Category: ${classification.category}\n`;
  section += `Confidence: ${classification.confidence.toUpperCase()}\n\n`;
  
  // Stripped-down notice identification (action-focused only)
  const noticeIdentification = {
    CP2000: "Proposed income assessment. Response required within 30 days.",
    CP14: "Balance due - first notice. Payment or dispute required within 21 days.",
    CP501: "Balance due - first reminder. Escalation from CP14. Immediate action required.",
    CP503: "Balance due - second reminder. Next step: CP504 (levy authorization).",
    CP504: "Intent to levy. Final notice before asset seizure. 30 days to respond or request hearing.",
    CP75: "Examination notice. Documentation required. Response deadline per notice.",
    AUDIT_LETTER: "Formal audit. Comprehensive documentation required. Professional representation recommended.",
    IDENTITY_VERIFICATION: "Identity verification required. Refund held until verified.",
    UNKNOWN: "Notice type unconfirmed. Assume response required within 30 days. Professional consultation required."
  };
  
  section += noticeIdentification[classification.noticeType] || noticeIdentification.UNKNOWN;
  section += "\n\n";
  
  // Financial impact
  if (financialInfo && financialInfo.balanceDue) {
    section += "FINANCIAL IMPACT:\n\n";
    section += `Amount at Issue: $${financialInfo.balanceDue.toLocaleString()}\n`;
    if (financialInfo.proposedChange) {
      section += `Proposed Additional Tax: $${financialInfo.proposedChange.toLocaleString()}\n`;
    }
    if (financialInfo.penaltiesAndInterest) {
      section += `Penalties and Interest: $${financialInfo.penaltiesAndInterest.toLocaleString()}\n`;
    }
    section += `Financial Impact Level: ${financialInfo.financialImpact}\n\n`;
  }
  
  section += "───────────────────────────────────────────────────────────────\n\n";
  
  return section;
}

/**
 * Section 2: Your Required Action
 */
function formatSection2_RequiredAction(classification, deadlineIntelligence) {
  let section = "═══════════════════════════════════════════════════════════════\n";
  section += "SECTION 2: YOUR REQUIRED ACTION\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  section += `Response Required: ${classification.responseRequired ? "YES" : "NO"}\n`;
  
  if (classification.responseRequired) {
    section += `Urgency Level: ${deadlineIntelligence.deadline.urgencyLevel}\n`;
    section += `Days Remaining: ${deadlineIntelligence.deadline.daysRemaining}\n`;
    
    if (deadlineIntelligence.deadline.deadlineDate) {
      section += `Deadline Date: ${deadlineIntelligence.deadline.deadlineDate}\n`;
    }
    
    section += `\n${deadlineIntelligence.deadline.urgencyMessage}\n`;
    section += `${deadlineIntelligence.deadline.recommendedActionMessage}\n\n`;
    
    if (deadlineIntelligence.deadline.isOverdue) {
      section += `⚠️ CRITICAL: ${deadlineIntelligence.deadline.overdueMessage}\n\n`;
    }
    
    if (deadlineIntelligence.criticalWarning) {
      section += `${deadlineIntelligence.criticalWarning}\n\n`;
    }
  } else {
    section += "\nInformational notice. Response not required unless information is incorrect.\n\n";
  }
  
  section += "───────────────────────────────────────────────────────────────\n\n";
  
  return section;
}

/**
 * Section 3: Your Best Response Strategy
 */
function formatSection3_ResponseStrategy(classification, deadlineIntelligence) {
  let section = "═══════════════════════════════════════════════════════════════\n";
  section += "REQUIRED RESPONSE PROCEDURE\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  // Notice-specific strategies
  const strategies = {
    CP2000: [
      "1. REVIEW CAREFULLY: Compare the IRS information with your records for each item listed",
      "2. DETERMINE YOUR POSITION:",
      "   - AGREE: If the IRS is correct, sign and return the response form with payment or payment plan request",
      "   - DISAGREE: If the IRS is wrong, provide documentation proving your position",
      "   - PARTIAL: If some items are correct and others are not, address each item separately",
      "3. GATHER EVIDENCE: Collect Forms W-2, 1099, receipts, and any other supporting documents",
      "4. RESPOND IN WRITING: Use the response form included with the notice",
      "5. SEND CERTIFIED MAIL: Keep proof of mailing and delivery"
    ],
    
    CP14: [
      "1. VERIFY THE AMOUNT: Confirm the balance is correct by reviewing your tax account",
      "2. CHOOSE YOUR RESPONSE:",
      "   - PAY IN FULL: If you can pay, do so immediately to stop interest accrual",
      "   - PAYMENT PLAN: Request an installment agreement using Form 9465",
      "   - DISPUTE: If you disagree with the amount, provide documentation",
      "   - PENALTY ABATEMENT: If this is your first penalty, request first-time abatement",
      "3. ACT QUICKLY: Interest accrues daily - every day counts",
      "4. DOCUMENT EVERYTHING: Keep records of all payments and correspondence"
    ],
    
    CP503: [
      "1. IMMEDIATE ACTION REQUIRED: This is the second reminder - escalation is imminent",
      "2. PRIORITY ACTIONS:",
      "   - Make immediate payment if possible (even partial payment shows good faith)",
      "   - Request emergency installment agreement",
      "   - Provide evidence of financial hardship if unable to pay",
      "3. PREVENT LEVY: The next notice (CP504) authorizes asset seizure",
      "4. CONSIDER PROFESSIONAL HELP: At this stage, professional representation is strongly recommended"
    ],
    
    CP504: [
      "1. CRITICAL: You have 30 days to prevent levy action",
      "2. FILE FORM 12153: Request a Collection Due Process hearing to preserve appeal rights",
      "3. IMMEDIATE PAYMENT OR ARRANGEMENT: If possible, pay or set up payment plan immediately",
      "4. FINANCIAL HARDSHIP: If you cannot pay, file Form 433-A (Collection Information Statement)",
      "5. PROFESSIONAL REPRESENTATION: Do not attempt to handle this alone - hire a tax professional immediately"
    ],
    
    CP75: [
      "1. DO NOT PANIC: Audits are not accusations of wrongdoing",
      "2. GATHER DOCUMENTATION: Collect all records specifically requested in the notice",
      "3. ORGANIZE BY CATEGORY: Sort documents by tax return line item",
      "4. DO NOT VOLUNTEER: Only provide what is specifically requested",
      "5. CONSIDER REPRESENTATION: File Form 2848 (Power of Attorney) to authorize a tax professional",
      "6. RESPOND TIMELY: Acknowledge the notice and confirm appointment or request reasonable extension"
    ],
    
    AUDIT_LETTER: [
      "1. HIRE PROFESSIONAL REPRESENTATION IMMEDIATELY: Do not attempt to handle a formal audit alone",
      "2. FILE FORM 2848: Authorize a tax attorney, CPA, or Enrolled Agent to represent you",
      "3. DO NOT MEET WITH IRS ALONE: All communication should go through your representative",
      "4. ORGANIZE RECORDS: Work with your representative to prepare comprehensive documentation",
      "5. DO NOT VOLUNTEER INFORMATION: Only provide what is specifically requested"
    ],
    
    IDENTITY_VERIFICATION: [
      "1. RESPOND IMMEDIATELY: Refund will not be released until identity is verified",
      "2. VERIFY ONLINE: Go to IRS.gov/VerifyReturn and follow the instructions",
      "3. CALL IF NEEDED: Use the phone number on the notice if online verification fails",
      "4. HAVE DOCUMENTS READY: Prior year return, photo ID, and financial documents",
      "5. MONITOR CREDIT: This may indicate identity theft - check your credit reports"
    ]
  };
  
  const strategy = strategies[classification.noticeType] || [
    "1. READ THE NOTICE CAREFULLY: Identify what the IRS is requesting",
    "2. GATHER DOCUMENTATION: Collect any relevant records",
    "3. RESPOND IN WRITING: Address each point raised in the notice",
    "4. KEEP COPIES: Maintain records of all correspondence",
    "5. SEND CERTIFIED MAIL: Obtain proof of delivery"
  ];
  
  strategy.forEach(step => {
    section += step + "\n";
  });
  
  section += "\n───────────────────────────────────────────────────────────────\n\n";
  
  return section;
}

/**
 * Section 4: What Happens Next (Timeline)
 */
function formatSection4_Timeline(deadlineIntelligence) {
  let section = "═══════════════════════════════════════════════════════════════\n";
  section += "SECTION 4: WHAT HAPPENS NEXT (TIMELINE)\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  section += "IF YOU TAKE NO ACTION:\n\n";
  
  deadlineIntelligence.scenarios.ifNoAction.consequences.forEach(consequence => {
    section += `${consequence}\n`;
  });
  
  section += "\n\nIF YOU RESPOND CORRECTLY:\n\n";
  
  deadlineIntelligence.scenarios.ifCorrectResponse.benefits.forEach(benefit => {
    section += `• ${benefit}\n`;
  });
  
  section += "\n\nIF YOU RESPOND INCORRECTLY OR INCOMPLETELY:\n\n";
  
  deadlineIntelligence.scenarios.ifPartialResponse.risks.forEach(risk => {
    section += `• ${risk}\n`;
  });
  
  section += "\n───────────────────────────────────────────────────────────────\n\n";
  
  return section;
}

/**
 * Section 5: Risk Assessment (only if risks detected)
 */
function formatSection5_RiskAssessment(riskAnalysis) {
  let section = "═══════════════════════════════════════════════════════════════\n";
  section += "SECTION 5: RISK ASSESSMENT\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  section += `Overall Risk Level: ${riskAnalysis.overallRisk}\n`;
  section += `Safety Score: ${riskAnalysis.safetyScore}/100\n\n`;
  
  if (riskAnalysis.admissionsOfFault.length > 0) {
    section += "⚠️ DETECTED ADMISSIONS OF FAULT:\n\n";
    riskAnalysis.admissionsOfFault.forEach((item, index) => {
      section += `${index + 1}. Risk Level: ${item.risk}\n`;
      section += `   Issue: ${item.issue}\n`;
      section += `   Safer Approach: ${item.saferAlternative}\n\n`;
    });
  }
  
  if (riskAnalysis.overDisclosure.length > 0) {
    section += "⚠️ OVER-DISCLOSURE DETECTED:\n\n";
    riskAnalysis.overDisclosure.forEach((item, index) => {
      section += `${index + 1}. ${item.warning}\n\n`;
    });
  }
  
  section += "───────────────────────────────────────────────────────────────\n\n";
  
  return section;
}

/**
 * Section 6: When Professional Help Becomes Necessary
 */
function formatSection6_ProfessionalHelp(professionalHelp, classification, financialInfo) {
  let section = "═══════════════════════════════════════════════════════════════\n";
  section += "PROFESSIONAL REPRESENTATION THRESHOLD\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  if (professionalHelp.recommendProfessional) {
    section += `STATUS: Professional representation ${professionalHelp.urgency}\n`;
    section += `REASON: ${professionalHelp.reason}\n\n`;
    
    if (professionalHelp.urgency === "CRITICAL") {
      section += "⚠️ CRITICAL: Do not proceed without professional representation.\n";
      section += "Risk: Significant financial harm, audit expansion, or criminal referral.\n\n";
    }
    
    section += "PROFESSIONAL REPRESENTATION REQUIRED WHEN:\n\n";
    section += "• Amount exceeds $10,000\n";
    section += "• Audit or examination notice\n";
    section += "• Intent to levy issued (CP504, Letter 1058)\n";
    section += "• Multiple tax years involved\n";
    section += "• Complex tax issues (business, foreign accounts)\n";
    section += "• Prior resolution attempts failed\n";
    section += "• Criminal investigation suspected\n\n";
  } else {
    section += "STATUS: Professional representation optional for this case.\n\n";
    section += "Self-response acceptable if:\n";
    section += "• Issue is straightforward\n";
    section += "• Documentation complete\n";
    section += "• Amount under threshold\n";
    section += "• IRS requirements understood\n\n";
  }
  
  section += "REPRESENTATION OPTIONS:\n\n";
  section += "• Tax Attorney: Legal issues, audits, appeals, collection\n";
  section += "• CPA: Complex calculations, return preparation\n";
  section += "• Enrolled Agent: IRS representation, tax resolution\n\n";
  
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  return section;
}

/**
 * Formats IRS response letter output
 * @param {Object} params - Response letter components
 * @returns {string} Formatted response letter
 */
function formatResponseLetter(params) {
  const {
    classification,
    playbook,
    userPosition,
    evidenceMap,
    aiGeneratedContent,
    deadlineIntelligence
  } = params;
  
  let letter = "";
  
  // Header
  letter += "[YOUR NAME]\n";
  letter += "[YOUR ADDRESS]\n";
  letter += "[CITY, STATE ZIP]\n";
  letter += "[YOUR PHONE NUMBER]\n";
  letter += "[YOUR EMAIL]\n\n";
  letter += `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
  letter += "Internal Revenue Service\n";
  letter += "[IRS ADDRESS FROM NOTICE]\n\n";
  letter += `RE: Response to ${classification.noticeType}\n`;
  letter += "    Notice Date: [DATE FROM NOTICE]\n";
  letter += "    Tax Year: [TAX YEAR]\n";
  letter += "    Taxpayer ID: [YOUR SSN OR EIN - LAST 4 DIGITS ONLY]\n\n";
  letter += "Dear Sir or Madam:\n\n";
  
  // Body (AI-generated content goes here, constrained by playbook)
  letter += aiGeneratedContent + "\n\n";
  
  // Evidence section (if applicable)
  if (evidenceMap && evidenceMap.toAttach.length > 0) {
    letter += "SUPPORTING DOCUMENTATION:\n\n";
    letter += "The following documents are enclosed to support this response:\n\n";
    evidenceMap.toAttach.forEach((item, index) => {
      letter += `${index + 1}. ${item.document.name} - ${item.supports}\n`;
    });
    letter += "\n";
  }
  
  // Closing
  letter += "I request that you review this information and adjust your records accordingly. ";
  letter += "Please confirm receipt of this correspondence and advise of any additional information required.\n\n";
  letter += "Thank you for your attention to this matter.\n\n";
  letter += "Sincerely,\n\n";
  letter += "[YOUR SIGNATURE]\n";
  letter += "[YOUR PRINTED NAME]\n";
  letter += "[YOUR SSN OR EIN - LAST 4 DIGITS ONLY]\n\n";
  
  // Enclosures
  if (evidenceMap && evidenceMap.toAttach.length > 0) {
    letter += `Enclosures: ${evidenceMap.toAttach.length}\n`;
  }
  
  return letter;
}

/**
 * Formats disclaimer based on notice type and risk level
 * @param {Object} classification - Notice classification
 * @param {Object} riskAnalysis - Risk analysis (optional)
 * @returns {string} Formatted disclaimer
 */
function formatDisclaimer(classification, riskAnalysis) {
  let disclaimer = "\n\n═══════════════════════════════════════════════════════════════\n";
  disclaimer += "LEGAL NOTICE\n";
  disclaimer += "═══════════════════════════════════════════════════════════════\n\n";
  
  disclaimer += "This is a procedural guidance system. Not legal advice. Not tax advice.\n";
  disclaimer += "Professional representation required for final decisions.\n\n";
  
  if (riskAnalysis && (riskAnalysis.overallRisk === "HIGH" || riskAnalysis.overallRisk === "CRITICAL")) {
    disclaimer += "⚠️ Risk factors detected. Professional consultation required before action.\n\n";
  }
  
  const highRiskNotices = ["CP504", "CP75", "AUDIT_LETTER", "LETTER_1058"];
  if (highRiskNotices.includes(classification.noticeType)) {
    disclaimer += "⚠️ High-risk notice type. Professional representation required.\n\n";
  }
  
  disclaimer += "Verify all information with IRS. Consult qualified tax professional before responding.\n\n";
  disclaimer += "═══════════════════════════════════════════════════════════════\n";
  
  return disclaimer;
}

module.exports = {
  formatAnalysisOutput,
  formatResponseLetter,
  formatDisclaimer
};

