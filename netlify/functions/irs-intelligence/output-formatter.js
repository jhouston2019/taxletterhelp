/**
 * STRUCTURED OUTPUT FORMATTER
 * 
 * Purpose: Enforces consistent, professional output structure for all IRS responses.
 * No chat style, no emojis, pure procedural intelligence.
 * 
 * Why this matters:
 * - Consistent format builds trust and professionalism
 * - Ensures all critical information is communicated
 * - Makes output scannable and actionable
 * - Differentiates from generic AI chat responses
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
  section += "SECTION 1: WHAT THIS IRS NOTICE MEANS\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  section += `Notice Type: ${classification.noticeType}\n`;
  section += `Description: ${classification.description}\n`;
  section += `Category: ${classification.category}\n`;
  section += `Detection Confidence: ${classification.confidence.toUpperCase()}\n\n`;
  
  section += "PLAIN ENGLISH EXPLANATION:\n\n";
  
  // Notice-specific explanations
  const explanations = {
    CP2000: "The IRS has information from third parties (employers, banks, etc.) that does not match what you reported on your tax return. This is NOT a bill yet - it is a proposed change. You have the right to agree, disagree, or partially agree with the proposed changes.",
    
    CP14: "You have an unpaid balance on your tax account. This is the first notice of the balance due. The IRS expects payment or a response explaining why you disagree with the amount.",
    
    CP501: "This is the FIRST REMINDER that you have an unpaid balance. The IRS sent a previous notice (CP14) that was not resolved. This is an escalation and requires immediate attention.",
    
    CP503: "This is the SECOND REMINDER of your unpaid balance. This is a critical escalation. The next step is CP504 (Intent to Levy), which authorizes the IRS to seize your bank accounts, garnish wages, or take other collection action.",
    
    CP504: "This is the FINAL NOTICE before the IRS takes enforcement action. The IRS is notifying you of their intent to levy (seize) your assets, bank accounts, or wages. You have 30 days to respond or file for a Collection Due Process hearing to preserve your appeal rights.",
    
    CP75: "The IRS has selected your tax return for examination (audit). This notice requests specific documentation to verify items on your return. This is not an accusation of wrongdoing - audits can be random or triggered by specific items.",
    
    AUDIT_LETTER: "This is a formal audit examination notice. The IRS is conducting a detailed review of your tax return and requires comprehensive documentation. This is more serious than a CP75 and typically involves an in-person or virtual meeting with an IRS examiner.",
    
    IDENTITY_VERIFICATION: "The IRS has flagged your tax return for potential identity theft or fraud. They are requiring you to verify your identity before processing your return or releasing your refund. This does not necessarily mean you are suspected of fraud - it may be a routine security check.",
    
    UNKNOWN: "The specific notice type could not be definitively identified. However, based on the content, this appears to be an IRS correspondence requiring a response. Treat this as urgent until you can clarify the specific requirements with the IRS."
  };
  
  section += explanations[classification.noticeType] || explanations.UNKNOWN;
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
    section += "\nThis notice is informational. While a response is not strictly required, you should review it carefully to ensure the information is correct. If you disagree with any information, you should respond to correct the record.\n\n";
  }
  
  section += "───────────────────────────────────────────────────────────────\n\n";
  
  return section;
}

/**
 * Section 3: Your Best Response Strategy
 */
function formatSection3_ResponseStrategy(classification, deadlineIntelligence) {
  let section = "═══════════════════════════════════════════════════════════════\n";
  section += "SECTION 3: YOUR BEST RESPONSE STRATEGY\n";
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
  section += "SECTION 6: WHEN PROFESSIONAL HELP BECOMES NECESSARY\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";
  
  if (professionalHelp.recommendProfessional) {
    section += `RECOMMENDATION: Professional representation is ${professionalHelp.urgency}\n\n`;
    section += `REASON: ${professionalHelp.reason}\n\n`;
    
    if (professionalHelp.urgency === "CRITICAL") {
      section += "⚠️ CRITICAL: Do not attempt to handle this matter without professional representation. ";
      section += "The risks of proceeding alone are too high and could result in significant financial harm, ";
      section += "expanded audit scope, or criminal referral.\n\n";
    }
    
    section += "WHEN TO HIRE A TAX PROFESSIONAL:\n\n";
    section += "• Amount at issue exceeds $10,000\n";
    section += "• Notice involves audit or examination\n";
    section += "• Intent to levy (CP504, Letter 1058) has been issued\n";
    section += "• Multiple tax years are involved\n";
    section += "• Complex tax issues (business income, foreign accounts, etc.)\n";
    section += "• You are unsure how to respond\n";
    section += "• Prior attempts to resolve have failed\n";
    section += "• Criminal investigation is suspected\n\n";
  } else {
    section += "RECOMMENDATION: Professional representation is optional for this notice type and amount.\n\n";
    section += "You may be able to handle this matter yourself if:\n";
    section += "• The issue is straightforward\n";
    section += "• You have all necessary documentation\n";
    section += "• The amount is relatively small\n";
    section += "• You understand the IRS requirements\n\n";
    section += "However, professional help is always beneficial and may result in better outcomes.\n\n";
  }
  
  section += "TYPES OF TAX PROFESSIONALS:\n\n";
  section += "• Tax Attorney: Best for legal issues, audits, appeals, and collection matters\n";
  section += "• Certified Public Accountant (CPA): Best for complex tax calculations and return preparation\n";
  section += "• Enrolled Agent (EA): IRS-licensed, best for IRS representation and tax resolution\n\n";
  
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
  disclaimer += "IMPORTANT DISCLAIMER\n";
  disclaimer += "═══════════════════════════════════════════════════════════════\n\n";
  
  disclaimer += "This analysis is provided for informational purposes only and does not constitute legal or tax advice. ";
  disclaimer += "While this tool uses IRS-specific procedural knowledge to provide guidance, it cannot replace professional representation.\n\n";
  
  if (riskAnalysis && riskAnalysis.overallRisk === "HIGH" || riskAnalysis && riskAnalysis.overallRisk === "CRITICAL") {
    disclaimer += "⚠️ IMPORTANT: This matter involves significant risk factors. Professional consultation is strongly recommended before taking any action.\n\n";
  }
  
  const highRiskNotices = ["CP504", "CP75", "AUDIT_LETTER", "LETTER_1058"];
  if (highRiskNotices.includes(classification.noticeType)) {
    disclaimer += "⚠️ CRITICAL: This notice type carries serious consequences. Professional representation is strongly recommended.\n\n";
  }
  
  disclaimer += "You should verify all information with the IRS and consult with a qualified tax professional before responding to any IRS notice.\n\n";
  disclaimer += "═══════════════════════════════════════════════════════════════\n";
  
  return disclaimer;
}

module.exports = {
  formatAnalysisOutput,
  formatResponseLetter,
  formatDisclaimer
};

