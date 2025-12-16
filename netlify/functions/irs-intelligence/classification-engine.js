// CORE INTELLIGENCE — DO NOT MODIFY WITHOUT TEST SUITE
/**
 * IRS NOTICE CLASSIFICATION ENGINE
 * 
 * Purpose: Deterministic classification layer that identifies IRS notice types
 * and extracts critical metadata BEFORE AI generation.
 * 
 * Why this is safer than general AI:
 * - Pattern matching prevents AI hallucination
 * - Deterministic rules ensure consistency
 * - No AI guessing in classification
 * - Drives all downstream procedural logic
 * 
 * Where logic overrides AI:
 * - Notice type identification (regex patterns)
 * - Deadline extraction (date parsing)
 * - Financial amount detection (pattern matching)
 * - Confidence scoring (rule-based)
 */

/**
 * Classifies an IRS notice based on deterministic pattern matching
 * @param {string} inputText - Raw text from the IRS letter
 * @returns {Object} Classification result with notice type, urgency, deadlines, and risks
 */
function classifyIRSNotice(inputText) {
  const text = inputText.toUpperCase();
  
  // Pattern matching for specific notice types
  const classifications = [
    // CP2000 - Proposed Changes to Tax Return
    {
      pattern: /CP-?2000|PROPOSED CHANGES TO YOUR.*TAX RETURN/,
      noticeType: "CP2000",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Proposed assessment becomes final if not responded to",
        "Additional penalties and interest will accrue",
        "Loss of appeal rights after 90 days",
        "Potential levy or lien action"
      ],
      category: "PROPOSED_ASSESSMENT",
      description: "Underreported Income Notice"
    },
    
    // CP14 - Balance Due (First Notice)
    {
      pattern: /CP-?14|YOU OWE ADDITIONAL TAX|BALANCE DUE.*FIRST NOTICE/,
      noticeType: "CP14",
      urgencyLevel: "medium",
      responseRequired: true,
      typicalDeadlineDays: 21,
      escalationRisk: [
        "Penalties and interest continue to accrue",
        "Progression to CP501 and CP503 notices",
        "Potential levy action after CP504",
        "Credit score impact if unpaid"
      ],
      category: "BALANCE_DUE",
      description: "First Balance Due Notice"
    },
    
    // CP501 - First Reminder of Balance Due
    {
      pattern: /CP-?501|REMINDER.*BALANCE DUE|FIRST REMINDER/,
      noticeType: "CP501",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Escalation to CP503 (second reminder)",
        "Increased penalties and interest",
        "Potential levy action within 60-90 days",
        "Federal tax lien filing"
      ],
      category: "BALANCE_DUE",
      description: "First Reminder - Balance Due"
    },
    
    // CP503 - Second Reminder of Balance Due
    {
      pattern: /CP-?503|SECOND REMINDER.*BALANCE DUE|IMMEDIATE PAYMENT/,
      noticeType: "CP503",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 21,
      escalationRisk: [
        "Escalation to CP504 (Intent to Levy)",
        "Federal tax lien may be filed",
        "Bank levy or wage garnishment imminent",
        "Seizure of assets possible"
      ],
      category: "BALANCE_DUE",
      description: "Second Reminder - Urgent Action Required"
    },
    
    // CP504 - Intent to Levy (Final Notice)
    {
      pattern: /CP-?504|INTENT TO LEVY|NOTICE OF INTENT TO SEIZE|FINAL NOTICE/,
      noticeType: "CP504",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Bank account levy within 30 days",
        "Wage garnishment authorization",
        "Seizure of property or assets",
        "Federal tax lien if not already filed",
        "Loss of collection due process rights"
      ],
      category: "LEVY_INTENT",
      description: "Intent to Levy - Final Notice Before Enforcement"
    },
    
    // CP75 / CP75A - Audit Notice
    {
      pattern: /CP-?75|EXAMINATION OF YOUR TAX RETURN|AUDIT NOTICE|WE ARE EXAMINING/,
      noticeType: "CP75",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Proposed assessment if no response",
        "Expansion of audit scope",
        "Referral to criminal investigation (if fraud suspected)",
        "Penalties for substantial understatement",
        "Multi-year audit expansion"
      ],
      category: "AUDIT",
      description: "Audit / Examination Notice"
    },
    
    // Letter 525 / 2205 - Formal Audit Notification
    {
      pattern: /LETTER 525|LETTER 2205|EXAMINATION APPOINTMENT|FIELD AUDIT/,
      noticeType: "AUDIT_LETTER",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 21,
      escalationRisk: [
        "Summons for records if non-responsive",
        "Proposed assessment based on available information",
        "Penalties for non-cooperation",
        "Potential fraud referral",
        "Audit expansion to related parties"
      ],
      category: "AUDIT",
      description: "Formal Audit Examination Letter"
    },
    
    // 5071C / 5747C / 4883C - Identity Verification
    {
      pattern: /5071C|5747C|4883C|VERIFY YOUR IDENTITY|IDENTITY VERIFICATION|POTENTIAL IDENTITY THEFT/,
      noticeType: "IDENTITY_VERIFICATION",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Refund hold indefinitely",
        "Return marked as fraudulent",
        "Future returns automatically flagged",
        "Requirement for in-person verification",
        "Potential criminal investigation"
      ],
      category: "IDENTITY_VERIFICATION",
      description: "Identity Verification Required"
    },
    
    // CP2501 - Underreported Income (Informational)
    {
      pattern: /CP-?2501|INFORMATION DOES NOT MATCH|INCOME DISCREPANCY/,
      noticeType: "CP2501",
      urgencyLevel: "medium",
      responseRequired: false,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "May escalate to CP2000 if not addressed",
        "Potential audit trigger",
        "Future returns under increased scrutiny"
      ],
      category: "INFORMATIONAL",
      description: "Income Discrepancy - Informational Notice"
    },
    
    // CP11 / CP12 - Changes to Tax Return
    {
      pattern: /CP-?11|CP-?12|WE MADE CHANGES TO YOUR RETURN|CORRECTED YOUR TAX RETURN/,
      noticeType: "CP11_CP12",
      urgencyLevel: "medium",
      responseRequired: false,
      typicalDeadlineDays: 60,
      escalationRisk: [
        "Changes become final if not disputed",
        "Potential refund reduction or balance due",
        "Limited time to file amended return"
      ],
      category: "RETURN_ADJUSTMENT",
      description: "IRS Made Changes to Your Return"
    },
    
    // CP21 Series - Refund Offset
    {
      pattern: /CP-?21|CP-?22|CP-?23|REFUND OFFSET|WE APPLIED YOUR REFUND/,
      noticeType: "REFUND_OFFSET",
      urgencyLevel: "low",
      responseRequired: false,
      typicalDeadlineDays: 60,
      escalationRisk: [
        "Limited time to dispute offset",
        "May indicate other outstanding liabilities"
      ],
      category: "REFUND_OFFSET",
      description: "Refund Applied to Other Debt"
    },
    
    // LT11 / LT1058 - Intent to Terminate Installment Agreement
    {
      pattern: /LT-?11|LT-?1058|TERMINATE.*INSTALLMENT AGREEMENT|DEFAULT.*PAYMENT PLAN/,
      noticeType: "INSTALLMENT_TERMINATION",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Immediate levy action upon termination",
        "Full balance becomes due immediately",
        "Loss of installment agreement privileges",
        "Difficulty reinstating payment plan"
      ],
      category: "PAYMENT_PLAN",
      description: "Intent to Terminate Installment Agreement"
    },
    
    // Letter 1058 / LT11 - Final Notice of Intent to Levy
    {
      pattern: /LETTER 1058|FINAL NOTICE.*INTENT TO LEVY|YOUR RIGHT TO A HEARING/,
      noticeType: "LETTER_1058",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Levy action within 30 days",
        "Last opportunity for Collection Due Process hearing",
        "Bank account seizure",
        "Wage garnishment",
        "Asset seizure"
      ],
      category: "LEVY_INTENT",
      description: "Final Notice Before Levy - Collection Due Process Rights"
    },
    
    // CP90 / CP297 - Final Notice Before Levy (Statutory)
    {
      pattern: /CP-?90|CP-?297|FINAL NOTICE OF INTENT TO LEVY|NOTICE OF YOUR RIGHT TO A HEARING/,
      noticeType: "CP90_CP297",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Levy action after 30 days",
        "Loss of Collection Due Process appeal rights",
        "Federal tax lien if not filed",
        "Passport revocation for large debts",
        "State tax refund offset"
      ],
      category: "LEVY_INTENT",
      description: "Final Notice - Right to Collection Due Process Hearing"
    }
  ];
  
  // Find matching classification
  for (const classification of classifications) {
    if (classification.pattern.test(text)) {
      return {
        noticeType: classification.noticeType,
        urgencyLevel: classification.urgencyLevel,
        responseRequired: classification.responseRequired,
        typicalDeadlineDays: classification.typicalDeadlineDays,
        escalationRisk: classification.escalationRisk,
        category: classification.category,
        description: classification.description,
        confidence: "high",
        detectionMethod: "pattern_match"
      };
    }
  }
  
  // Fallback: Attempt to extract notice number
  const noticeNumberMatch = text.match(/\b(CP|LT|LETTER)\s*-?\s*(\d+[A-Z]*)\b/);
  if (noticeNumberMatch) {
    return {
      noticeType: noticeNumberMatch[0].replace(/\s+/g, ''),
      urgencyLevel: "medium",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Unknown escalation path - review notice carefully",
        "Consult tax professional for specific guidance"
      ],
      category: "UNKNOWN",
      description: "Unrecognized IRS Notice",
      confidence: "low",
      detectionMethod: "notice_number_extraction"
    };
  }
  
  // Ultimate fallback
  return {
    noticeType: "UNKNOWN",
    urgencyLevel: "medium",
    responseRequired: true,
    typicalDeadlineDays: 30,
    escalationRisk: [
      "Unable to determine specific notice type",
      "Assume response required within 30 days",
      "Professional consultation strongly recommended"
    ],
    category: "UNKNOWN",
    description: "Unable to Classify Notice Type",
    confidence: "low",
    detectionMethod: "fallback"
  };
}

/**
 * Extracts deadline information from notice text
 * @param {string} inputText - Raw text from the IRS letter
 * @returns {Object} Deadline information including dates and days remaining
 */
function extractDeadlineInfo(inputText) {
  const text = inputText.toUpperCase();
  
  // Common deadline patterns
  const deadlinePatterns = [
    /RESPOND BY\s+([A-Z]+\s+\d{1,2},?\s+\d{4})/,
    /REPLY BY\s+([A-Z]+\s+\d{1,2},?\s+\d{4})/,
    /DUE DATE:\s*([A-Z]+\s+\d{1,2},?\s+\d{4})/,
    /DEADLINE:\s*([A-Z]+\s+\d{1,2},?\s+\d{4})/,
    /BY\s+([A-Z]+\s+\d{1,2},?\s+\d{4})/,
    /WITHIN\s+(\d+)\s+DAYS/
  ];
  
  let deadlineDate = null;
  let daysFromNotice = null;
  
  // Try to find explicit date
  for (const pattern of deadlinePatterns.slice(0, 5)) {
    const match = text.match(pattern);
    if (match) {
      try {
        deadlineDate = new Date(match[1]);
        if (!isNaN(deadlineDate.getTime())) {
          break;
        }
      } catch (e) {
        // Invalid date, continue
      }
    }
  }
  
  // Try to find "within X days" pattern
  const daysMatch = text.match(/WITHIN\s+(\d+)\s+DAYS/);
  if (daysMatch) {
    daysFromNotice = parseInt(daysMatch[1]);
  }
  
  // Calculate days remaining if we have a deadline date
  let daysRemaining = null;
  if (deadlineDate) {
    const today = new Date();
    const diffTime = deadlineDate - today;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  return {
    deadlineDate: deadlineDate ? deadlineDate.toISOString().split('T')[0] : null,
    daysRemaining: daysRemaining,
    daysFromNoticeDate: daysFromNotice,
    urgencyStatus: daysRemaining !== null ? 
      (daysRemaining < 7 ? "CRITICAL" : daysRemaining < 14 ? "URGENT" : "NORMAL") : 
      "UNKNOWN"
  };
}

/**
 * Extracts dollar amounts from notice text
 * @param {string} inputText - Raw text from the IRS letter
 * @returns {Object} Financial information including amounts owed, proposed changes, etc.
 */
function extractFinancialInfo(inputText) {
  const amounts = [];
  
  // Pattern for dollar amounts
  const amountPattern = /\$[\d,]+\.?\d*/g;
  const matches = inputText.match(amountPattern);
  
  if (matches) {
    matches.forEach(match => {
      const value = parseFloat(match.replace(/[$,]/g, ''));
      amounts.push(value);
    });
  }
  
  // Try to identify specific amount types
  const text = inputText.toUpperCase();
  let balanceDue = null;
  let proposedChange = null;
  let penaltiesAndInterest = null;
  
  // Balance due patterns
  const balanceMatch = text.match(/(?:BALANCE DUE|AMOUNT DUE|YOU OWE)[\s:]*\$?([\d,]+\.?\d*)/);
  if (balanceMatch) {
    balanceDue = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }
  
  // Proposed change patterns
  const proposedMatch = text.match(/(?:PROPOSED|ADDITIONAL|INCREASE)[\s\w]*\$?([\d,]+\.?\d*)/);
  if (proposedMatch) {
    proposedChange = parseFloat(proposedMatch[1].replace(/,/g, ''));
  }
  
  // Penalties and interest
  const penaltyMatch = text.match(/(?:PENALTIES?|INTEREST)[\s:]*\$?([\d,]+\.?\d*)/);
  if (penaltyMatch) {
    penaltiesAndInterest = parseFloat(penaltyMatch[1].replace(/,/g, ''));
  }
  
  return {
    allAmounts: amounts,
    largestAmount: amounts.length > 0 ? Math.max(...amounts) : null,
    balanceDue: balanceDue,
    proposedChange: proposedChange,
    penaltiesAndInterest: penaltiesAndInterest,
    financialImpact: balanceDue && balanceDue > 25000 ? "HIGH" : 
                     balanceDue && balanceDue > 5000 ? "MEDIUM" : "LOW"
  };
}

module.exports = {
  classifyIRSNotice,
  extractDeadlineInfo,
  extractFinancialInfo
};

