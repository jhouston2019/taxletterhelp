/**
 * IRS RESPONSE PLAYBOOKS
 * 
 * Purpose: Notice-specific response templates and constraints that ensure
 * procedurally correct, IRS-appropriate correspondence.
 * 
 * Why this matters:
 * - Each notice type has specific response requirements
 * - Prevents generic, unhelpful responses
 * - Enforces IRS procedural rules
 * - Guides AI to produce compliant correspondence
 */

const IRS_PLAYBOOKS = {
  CP2000: {
    noticeType: "CP2000",
    fullName: "Underreported Income Notice",
    allowedUserPositions: [
      "agree",           // Agree with proposed changes
      "partial_dispute", // Agree with some, dispute others
      "full_dispute"     // Disagree with all changes
    ],
    
    requiredElements: [
      "Notice number and date reference",
      "Taxpayer identification (SSN/EIN)",
      "Tax year in question",
      "Specific line-by-line response to each discrepancy",
      "Supporting documentation list",
      "Signature and date"
    ],
    
    prohibitedLanguage: [
      "I didn't know",
      "I forgot",
      "I wasn't aware",
      "Nobody told me",
      "I didn't think it mattered",
      "It was only a small amount"
    ],
    
    requiredTone: "neutral-factual",
    
    evidenceTypes: [
      "Form 1099 corrections or explanations",
      "Form W-2 copies",
      "Schedule C supporting documentation",
      "Bank statements (only specific transactions)",
      "Receipts for deductions",
      "Prior year returns (if relevant)",
      "Correspondence with payers"
    ],
    
    responseStructure: {
      opening: "Acknowledge receipt of CP2000 and reference notice details",
      body: "Address each proposed change individually with specific facts",
      documentation: "List attached evidence and what each document proves",
      closing: "Request specific action (accept agreement, adjust proposal, or dismiss)",
      signature: "Taxpayer signature and date required"
    },
    
    criticalWarnings: [
      "Do NOT agree to amounts you don't owe",
      "Do NOT provide information about unreported income from other years",
      "Do NOT attach full bank statements - only relevant pages",
      "Do NOT miss the 30-day deadline - it becomes final",
      "Do NOT ignore - silence equals agreement"
    ],
    
    escalationPath: "If not responded to within 30 days, becomes Statutory Notice of Deficiency (90-day letter)",
    
    professionalHelpThreshold: {
      amount: 10000,
      complexity: "Multiple income sources with complex documentation",
      risk: "Potential fraud indicators or pattern of non-filing"
    }
  },
  
  CP14: {
    noticeType: "CP14",
    fullName: "First Balance Due Notice",
    allowedUserPositions: [
      "pay_in_full",
      "request_payment_plan",
      "dispute_amount",
      "request_penalty_abatement"
    ],
    
    requiredElements: [
      "Notice number and date",
      "Tax year and form number",
      "Acknowledgment of balance or dispute",
      "Payment arrangement proposal or dispute basis",
      "Contact information"
    ],
    
    prohibitedLanguage: [
      "I can't pay",
      "I refuse to pay",
      "This is unfair",
      "I'll pay when I can"
    ],
    
    requiredTone: "cooperative-professional",
    
    evidenceTypes: [
      "Payment records (if claiming payment made)",
      "Financial hardship documentation (for payment plan)",
      "Reasonable cause explanation (for penalty abatement)",
      "Prior year returns (if disputing calculation)"
    ],
    
    responseStructure: {
      opening: "Acknowledge notice and balance",
      body: "State position (agree/dispute) and proposed resolution",
      documentation: "Provide supporting evidence for position",
      closing: "Request specific action or arrangement",
      signature: "Required for payment plan requests"
    },
    
    criticalWarnings: [
      "Interest accrues daily - act quickly",
      "Penalties increase over time",
      "Ignoring leads to CP501, then CP503, then CP504 (levy)",
      "Payment plans available but must be requested",
      "Penalty abatement possible for first-time offenders"
    ],
    
    escalationPath: "CP14 → CP501 (30 days) → CP503 (30 days) → CP504 (Intent to Levy)",
    
    professionalHelpThreshold: {
      amount: 25000,
      complexity: "Multiple tax years or complex penalty disputes",
      risk: "Prior levy action or existing liens"
    }
  },
  
  CP501: {
    noticeType: "CP501",
    fullName: "First Reminder - Balance Due",
    allowedUserPositions: [
      "pay_immediately",
      "request_payment_plan",
      "dispute_amount",
      "request_hardship_status"
    ],
    
    requiredElements: [
      "Immediate acknowledgment of urgency",
      "Specific payment proposal or dispute",
      "Timeline for resolution",
      "Contact information for follow-up"
    ],
    
    prohibitedLanguage: [
      "I need more time" (without specific plan),
      "I'm working on it",
      "I'll get to it soon"
    ],
    
    requiredTone: "urgent-cooperative",
    
    evidenceTypes: [
      "Financial statements (for hardship or payment plan)",
      "Payment proof (if claiming payment made)",
      "Dispute documentation (if challenging amount)"
    ],
    
    responseStructure: {
      opening: "Immediate acknowledgment and urgency recognition",
      body: "Concrete action plan with specific dates",
      documentation: "Supporting evidence for proposed resolution",
      closing: "Request confirmation of arrangement",
      signature: "Required"
    },
    
    criticalWarnings: [
      "This is the FIRST REMINDER - escalation is imminent",
      "CP503 (second reminder) follows in 30 days",
      "Levy action possible within 60-90 days",
      "Payment plan must be formalized, not just promised",
      "Federal tax lien may be filed"
    ],
    
    escalationPath: "CP501 → CP503 (30 days) → CP504 (Intent to Levy) → Actual Levy",
    
    professionalHelpThreshold: {
      amount: 15000,
      complexity: "Multiple years or disputed calculations",
      risk: "Prior collection action or lien"
    }
  },
  
  CP503: {
    noticeType: "CP503",
    fullName: "Second Reminder - Urgent Action Required",
    allowedUserPositions: [
      "pay_immediately",
      "request_emergency_payment_plan",
      "request_collection_due_process_hearing"
    ],
    
    requiredElements: [
      "Immediate response acknowledging critical status",
      "Specific payment or resolution within 10 days",
      "Evidence of good faith effort",
      "Request for hold on collection action"
    ],
    
    prohibitedLanguage: [
      "I need more time",
      "I'm trying",
      "This is too much pressure"
    ],
    
    requiredTone: "urgent-factual",
    
    evidenceTypes: [
      "Immediate payment proof",
      "Financial hardship documentation",
      "Offer in Compromise application (if applicable)",
      "Currently Not Collectible status request"
    ],
    
    responseStructure: {
      opening: "Immediate acknowledgment of critical status",
      body: "Concrete action taken or emergency request",
      documentation: "Proof of action or hardship",
      closing: "Request hold on levy action pending resolution",
      signature: "Required with date"
    },
    
    criticalWarnings: [
      "CRITICAL: This is the SECOND REMINDER",
      "CP504 (Intent to Levy) is next - typically within 21 days",
      "Bank levy or wage garnishment is imminent",
      "Federal tax lien likely if not already filed",
      "Professional representation strongly recommended"
    ],
    
    escalationPath: "CP503 → CP504 (21 days) → Levy Action (30 days after CP504)",
    
    professionalHelpThreshold: {
      amount: 5000,
      complexity: "Any amount at this stage",
      risk: "Levy action imminent - professional help critical"
    }
  },
  
  CP504: {
    noticeType: "CP504",
    fullName: "Intent to Levy - Final Notice",
    allowedUserPositions: [
      "request_collection_due_process_hearing",
      "pay_immediately",
      "request_currently_not_collectible_status",
      "submit_offer_in_compromise"
    ],
    
    requiredElements: [
      "Form 12153 (Request for Collection Due Process Hearing)",
      "Immediate payment or formal arrangement",
      "Evidence of inability to pay (if applicable)",
      "Request for stay of levy action"
    ],
    
    prohibitedLanguage: [
      "I'll pay soon",
      "Please give me more time",
      "I'm working on it"
    ],
    
    requiredTone: "formal-urgent",
    
    evidenceTypes: [
      "Form 12153 (CDP hearing request)",
      "Form 433-A or 433-F (Collection Information Statement)",
      "Form 656 (Offer in Compromise)",
      "Financial hardship documentation",
      "Evidence of payment or payment plan"
    ],
    
    responseStructure: {
      opening: "Immediate filing of Form 12153 or payment",
      body: "Formal request for specific relief with legal basis",
      documentation: "Complete financial disclosure or payment proof",
      closing: "Request stay of levy pending hearing or arrangement",
      signature: "Required with notarization for some forms"
    },
    
    criticalWarnings: [
      "FINAL NOTICE: Levy action authorized after 30 days",
      "File Form 12153 within 30 days to preserve appeal rights",
      "Bank accounts can be levied without further notice",
      "Wages can be garnished (up to 70% of take-home pay)",
      "Assets can be seized",
      "Professional representation is CRITICAL at this stage"
    ],
    
    escalationPath: "CP504 → Levy Action (30 days) → Bank Levy/Wage Garnishment/Asset Seizure",
    
    professionalHelpThreshold: {
      amount: 0,
      complexity: "Professional help MANDATORY at this stage",
      risk: "Immediate levy action - do not attempt to handle alone"
    }
  },
  
  CP75: {
    noticeType: "CP75",
    fullName: "Audit / Examination Notice",
    allowedUserPositions: [
      "cooperate_fully",
      "request_extension",
      "request_representation"
    ],
    
    requiredElements: [
      "Acknowledgment of examination",
      "Request for specific appointment or extension",
      "List of available documentation",
      "Power of Attorney (Form 2848) if using representative"
    ],
    
    prohibitedLanguage: [
      "I don't have those records",
      "I threw that away",
      "I can't remember",
      "That was a long time ago",
      "I didn't think I needed to keep that"
    ],
    
    requiredTone: "cooperative-professional",
    
    evidenceTypes: [
      "All requested documentation in notice",
      "Organized records by category",
      "Receipts and supporting documents",
      "Bank statements (only if specifically requested)",
      "Business records (if applicable)",
      "Form 2848 (Power of Attorney) if using representative"
    ],
    
    responseStructure: {
      opening: "Acknowledge examination and express cooperation",
      body: "Confirm appointment or request reasonable extension",
      documentation: "List available records and any missing items",
      closing: "Confirm next steps and contact information",
      signature: "Required"
    },
    
    criticalWarnings: [
      "DO NOT volunteer information not requested",
      "DO NOT provide records for years not under examination",
      "DO NOT make statements about intent or knowledge",
      "DO NOT meet with auditor alone - consider representation",
      "DO NOT ignore - can result in summons or proposed assessment",
      "Audit can expand to other years if issues found"
    ],
    
    escalationPath: "Examination → Proposed Assessment → Statutory Notice of Deficiency → Tax Court",
    
    professionalHelpThreshold: {
      amount: 5000,
      complexity: "Professional representation strongly recommended for all audits",
      risk: "High risk of unfavorable outcome without professional help"
    }
  },
  
  AUDIT_LETTER: {
    noticeType: "AUDIT_LETTER",
    fullName: "Formal Audit Examination Letter",
    allowedUserPositions: [
      "cooperate_with_representation",
      "request_extension",
      "request_records_review_time"
    ],
    
    requiredElements: [
      "Form 2848 (Power of Attorney) - HIGHLY RECOMMENDED",
      "Acknowledgment of examination",
      "Request for reasonable time to gather records",
      "Organized document production plan"
    ],
    
    prohibitedLanguage: [
      "I don't have that",
      "I lost those records",
      "I can't find that",
      "That's not important",
      "I didn't know I needed that"
    ],
    
    requiredTone: "formal-cooperative",
    
    evidenceTypes: [
      "Complete tax return workpapers",
      "Source documents for all items",
      "Organized by tax return line item",
      "Index of documents provided",
      "Form 2848 if using representative"
    ],
    
    responseStructure: {
      opening: "Formal acknowledgment through representative (preferred)",
      body: "Request reasonable time and clarification of scope",
      documentation: "Organized production of requested records only",
      closing: "Confirm process and communication protocol",
      signature: "Taxpayer and representative (if applicable)"
    },
    
    criticalWarnings: [
      "CRITICAL: Hire professional representation immediately",
      "DO NOT meet with IRS alone",
      "DO NOT answer questions without representative present",
      "DO NOT provide more than requested",
      "Summons can be issued for non-cooperation",
      "Fraud referral possible if serious issues found"
    ],
    
    escalationPath: "Examination → Proposed Assessment → Appeals → Tax Court → Collection",
    
    professionalHelpThreshold: {
      amount: 0,
      complexity: "Professional representation MANDATORY",
      risk: "Do not attempt to handle formal audit without professional help"
    }
  },
  
  IDENTITY_VERIFICATION: {
    noticeType: "IDENTITY_VERIFICATION",
    fullName: "Identity Verification Required",
    allowedUserPositions: [
      "verify_online",
      "verify_by_phone",
      "verify_in_person"
    ],
    
    requiredElements: [
      "Immediate response acknowledging notice",
      "Completion of verification process",
      "Required identification documents",
      "Confirmation of verification method"
    ],
    
    prohibitedLanguage: [
      "This isn't urgent",
      "I'll do it later",
      "I don't have time for this"
    ],
    
    requiredTone: "cooperative-immediate",
    
    evidenceTypes: [
      "Government-issued photo ID",
      "Social Security card",
      "Prior year tax return",
      "Financial documents from return",
      "Proof of address"
    ],
    
    responseStructure: {
      opening: "Immediate acknowledgment and action",
      body: "Completion of verification process",
      documentation: "Provide requested identification",
      closing: "Confirm verification completed",
      signature: "As required by verification process"
    },
    
    criticalWarnings: [
      "Refund will NOT be released until verified",
      "Deadline is strict - typically 30 days",
      "Failure to verify marks return as fraudulent",
      "Future returns will be delayed",
      "May require in-person verification if online fails",
      "Identity theft indicator - monitor credit"
    ],
    
    escalationPath: "Verification Request → Return Marked Fraudulent → Refund Denied → Future Returns Flagged",
    
    professionalHelpThreshold: {
      amount: null,
      complexity: "Can usually handle without professional help",
      risk: "Professional help if identity theft suspected"
    }
  },
  
  UNKNOWN: {
    noticeType: "UNKNOWN",
    fullName: "Unrecognized Notice Type",
    allowedUserPositions: [
      "request_clarification",
      "acknowledge_and_respond_generally"
    ],
    
    requiredElements: [
      "Reference to notice number and date",
      "Request for clarification of required action",
      "Statement of willingness to cooperate",
      "Request for additional time if needed"
    ],
    
    prohibitedLanguage: [
      "I don't understand this",
      "This doesn't make sense",
      "What do you want from me"
    ],
    
    requiredTone: "professional-inquisitive",
    
    evidenceTypes: [
      "Copy of notice received",
      "Any relevant tax documents"
    ],
    
    responseStructure: {
      opening: "Acknowledge receipt of notice",
      body: "Request clarification of required action and deadline",
      documentation: "Provide any obviously relevant documents",
      closing: "Request confirmation of next steps",
      signature: "Required"
    },
    
    criticalWarnings: [
      "Assume response required within 30 days",
      "Professional consultation recommended",
      "Do not ignore - respond even if unclear",
      "Request clarification from IRS if needed"
    ],
    
    escalationPath: "Unknown - assume standard collection or assessment process",
    
    professionalHelpThreshold: {
      amount: 0,
      complexity: "Professional help recommended for unknown notice types",
      risk: "Moderate to high - unknown risks"
    }
  }
};

/**
 * Gets the playbook for a specific notice type
 * @param {string} noticeType - The classified notice type
 * @returns {Object} The playbook for that notice type
 */
function getPlaybook(noticeType) {
  return IRS_PLAYBOOKS[noticeType] || IRS_PLAYBOOKS.UNKNOWN;
}

/**
 * Validates user position against allowed positions for notice type
 * @param {string} noticeType - The classified notice type
 * @param {string} userPosition - The user's stated position
 * @returns {Object} Validation result
 */
function validateUserPosition(noticeType, userPosition) {
  const playbook = getPlaybook(noticeType);
  const isValid = playbook.allowedUserPositions.includes(userPosition);
  
  return {
    valid: isValid,
    allowedPositions: playbook.allowedUserPositions,
    message: isValid ? 
      "Position is appropriate for this notice type" : 
      `Invalid position. Allowed positions: ${playbook.allowedUserPositions.join(', ')}`
  };
}

/**
 * Checks if text contains prohibited language
 * @param {string} text - Text to check
 * @param {string} noticeType - The classified notice type
 * @returns {Object} Check result with flagged phrases
 */
function checkProhibitedLanguage(text, noticeType) {
  const playbook = getPlaybook(noticeType);
  const flaggedPhrases = [];
  
  const lowerText = text.toLowerCase();
  playbook.prohibitedLanguage.forEach(phrase => {
    if (lowerText.includes(phrase.toLowerCase())) {
      flaggedPhrases.push(phrase);
    }
  });
  
  return {
    hasProhibitedLanguage: flaggedPhrases.length > 0,
    flaggedPhrases: flaggedPhrases,
    message: flaggedPhrases.length > 0 ?
      `Avoid these phrases: ${flaggedPhrases.join(', ')}` :
      "No prohibited language detected"
  };
}

/**
 * Determines if professional help is recommended
 * @param {string} noticeType - The classified notice type
 * @param {number} amount - Dollar amount involved
 * @param {string} complexity - Complexity description
 * @returns {Object} Recommendation result
 */
function assessProfessionalHelpNeed(noticeType, amount, complexity) {
  const playbook = getPlaybook(noticeType);
  const threshold = playbook.professionalHelpThreshold;
  
  const amountExceedsThreshold = threshold.amount !== null && amount > threshold.amount;
  const complexityHigh = complexity && complexity.toLowerCase().includes('complex');
  const mandatoryHelp = threshold.complexity && threshold.complexity.includes('MANDATORY');
  
  const needsHelp = amountExceedsThreshold || complexityHigh || mandatoryHelp;
  
  return {
    recommendProfessional: needsHelp,
    urgency: mandatoryHelp ? "CRITICAL" : amountExceedsThreshold ? "HIGH" : "MODERATE",
    reason: mandatoryHelp ? 
      threshold.complexity : 
      amountExceedsThreshold ?
        `Amount exceeds threshold of $${threshold.amount}` :
        threshold.complexity,
    threshold: threshold
  };
}

module.exports = {
  IRS_PLAYBOOKS,
  getPlaybook,
  validateUserPosition,
  checkProhibitedLanguage,
  assessProfessionalHelpNeed
};

