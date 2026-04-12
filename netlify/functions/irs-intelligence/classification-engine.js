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

const LT_BALANCE_REMINDER_RISKS = [
  "Balance continues to accrue penalties and interest",
  "Escalation to levy or lien if unpaid",
  "Collection enforcement may resume or intensify",
  "Federal tax lien filing possible"
];

function normalizeNoticeHeaderCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[\s\-–—:]+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function extractNoticeLineCode(inputText) {
  const lines = (inputText || "").split(/\r?\n/).slice(0, 65);
  for (const raw of lines) {
    const m = raw.trim().match(/^Notice:\s*(.+)$/i);
    if (!m) continue;
    const inner = m[1].trim();
    if (inner.length > 0 && inner.length <= 36) return inner;
  }
  return null;
}

function toClassificationResult(row, detectionMethod, confidence) {
  return {
    noticeType: row.noticeType,
    urgencyLevel: row.urgencyLevel,
    responseRequired: row.responseRequired,
    typicalDeadlineDays: row.typicalDeadlineDays,
    escalationRisk: row.escalationRisk,
    category: row.category,
    description: row.description,
    confidence,
    detectionMethod
  };
}

/**
 * Runs before the main classification table: glued LT/CP forms, Notice: line,
 * and semantic phrases that indicate notice type when codes are missing.
 * @param {string} rawInput
 * @param {Array<{pattern: RegExp, noticeType: string, ...}>} classifications
 * @returns {object|null} Full classification row or null
 */
function matchPriorityNoticeTypes(rawInput, classifications) {
  const raw = String(rawInput || "");
  if (!raw.trim()) return null;

  const codeSpecs = [
    [/\bLT-?\s*39\b|\bLT\s+39\b|\bLT39\b(?!\d)/i, "LT39"],
    [/\bLT-?\s*11\b|\bLT\s+11\b|\bLT11\b(?!\d)/i, "LT11"],
    [/\bLT-?\s*16\b|\bLT\s+16\b|\bLT16\b(?!\d)/i, "LT16"],
    [/\bLT-?\s*38\b|\bLT\s+38\b|\bLT38\b(?!\d)/i, "LT38"],
    [/\bLT-?\s*18\b|\bLT\s+18\b|\bLT18\b(?!\d)/i, "LT18"],
    [/\bLT-?\s*19\b|\bLT\s+19\b|\bLT19\b(?!\d)/i, "LT19"],
    [/\bCP-?\s*2000\b|\bCP\s+2000\b|\bCP2000\b(?!\d)/i, "CP2000"],
    [/\bCP-?\s*14\b|\bCP\s+14\b|\bCP14\b(?!\d)/i, "CP14"],
    [/\bCP-?\s*504\b|\bCP\s+504\b|\bCP504\b(?!\d)/i, "CP504"],
    [/\bCP-?\s*90\b|\bCP\s+90\b|\bCP90\b(?!\d)/i, "CP90_CP297"],
    [/\bCP-?\s*501\b|\bCP\s+501\b|\bCP501\b(?!\d)/i, "CP501"],
    [/\bCP-?\s*503\b|\bCP\s+503\b|\bCP503\b(?!\d)/i, "CP503"]
  ];

  for (const [re, noticeType] of codeSpecs) {
    if (re.test(raw)) {
      const row = classifications.find((c) => c.noticeType === noticeType);
      if (row) return row;
    }
  }

  const noticeLine = raw.match(/Notice:\s*([A-Z0-9\s\-–—]{1,24})/i);
  if (noticeLine) {
    const code = normalizeNoticeHeaderCode(noticeLine[1]);
    if (code.length >= 2) {
      const row = classifications.find(
        (c) => normalizeNoticeHeaderCode(c.noticeType) === code
      );
      if (row) return row;
    }
  }

  if (/intent\s+to\s+levy/i.test(raw)) {
    const row = classifications.find((c) => c.noticeType === "CP504");
    if (row) return row;
  }
  if (/final\s+notice/i.test(raw) && /\blevy\b/i.test(raw)) {
    const row =
      classifications.find((c) => c.noticeType === "LETTER_1058") ||
      classifications.find((c) => c.noticeType === "CP504");
    if (row) return row;
  }
  if (/unpaid\s+tax/i.test(raw) && /amount\s+due/i.test(raw)) {
    const row = classifications.find((c) => c.noticeType === "CP14");
    if (row) return row;
  }
  if (/proposed\s+changes/i.test(raw) && /\bincome\b/i.test(raw)) {
    const row = classifications.find((c) => c.noticeType === "CP2000");
    if (row) return row;
  }
  if (/\bexamination\b/i.test(raw) || /\baudit\b/i.test(raw)) {
    const row =
      classifications.find((c) => c.noticeType === "CP75") ||
      classifications.find((c) => c.noticeType === "AUDIT_LETTER");
    if (row) return row;
  }

  return null;
}

/**
 * Classifies an IRS notice based on deterministic pattern matching
 * @param {string} inputText - Raw text from the IRS letter
 * @returns {Object} Classification result with notice type, urgency, deadlines, and risks
 */
function classifyIRSNotice(inputText) {
  if (inputText == null || (typeof inputText === "string" && !String(inputText).trim())) {
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

    // LT11 – Final notice of intent to levy (CDP / levy track)
    {
      pattern: /\bLT-?\s*11\b|\bLT\s+11\b/,
      noticeType: "LT11",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Levy or seizure after response deadline",
        "Loss of Collection Due Process rights if not timely appealed",
        "Bank or wage levy authorization",
        "Asset seizure and lien enforcement"
      ],
      category: "LEVY_INTENT",
      description: "LT11 — Final notice of intent to levy"
    },

    // LT39 – Reminder, balance due (often 10-day response window)
    {
      pattern: /\bLT-?\s*39\b|\bLT\s+39\b|(?:BILLING\s+SUMMARY|AMOUNT\s+DUE|UNPAID\s+TAX).{0,180}(?:LT-?\s*39\b|\bLT\s+39\b)|(?:LT-?\s*39\b|\bLT\s+39\b).{0,180}(?:BILLING\s+SUMMARY|AMOUNT\s+DUE|UNPAID\s+TAX)/,
      noticeType: "LT39",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 10,
      escalationRisk: [
        "Short response window (often 10 days on LT39)",
        "Progression toward enforced collection if ignored",
        "Penalties and interest continue to accrue",
        "Potential lien or levy after deadline"
      ],
      category: "BALANCE_DUE",
      description: "LT39 — Reminder notice, balance due"
    },

    // LT16 – Collection notice
    {
      pattern: /\bLT-?\s*16\b|\bLT\s+16\b/,
      noticeType: "LT16",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 21,
      escalationRisk: LT_BALANCE_REMINDER_RISKS,
      category: "BALANCE_DUE",
      description: "LT16 — Collection notice"
    },

    // LT18 – Balance due reminder
    {
      pattern: /\bLT-?\s*18\b|\bLT\s+18\b/,
      noticeType: "LT18",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 21,
      escalationRisk: LT_BALANCE_REMINDER_RISKS,
      category: "BALANCE_DUE",
      description: "LT18 — Balance due reminder"
    },

    // LT19 – Balance due reminder
    {
      pattern: /\bLT-?\s*19\b|\bLT\s+19\b/,
      noticeType: "LT19",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 21,
      escalationRisk: LT_BALANCE_REMINDER_RISKS,
      category: "BALANCE_DUE",
      description: "LT19 — Balance due reminder"
    },

    // LT38 – Resumption of collection activity
    {
      pattern: /\bLT-?\s*38\b|\bLT\s+38\b/,
      noticeType: "LT38",
      urgencyLevel: "high",
      responseRequired: true,
      typicalDeadlineDays: 30,
      escalationRisk: [
        "Prior collection hold or pause may have ended",
        "Levy, lien, or offset activity may resume",
        "Penalties and interest continue to accrue",
        "Immediate payment or formal resolution typically required"
      ],
      category: "BALANCE_DUE",
      description: "LT38 — Resumption of collection activity"
    },
    
    // CP504 - Intent to Levy (Final Notice)
    {
      pattern: /CP-?504|NOTICE\s+OF\s+INTENT\s+TO\s+LEVY|NOTICE\s+OF\s+INTENT\s+TO\s+SEIZE|INTENT\s+TO\s+LEVY.*CP\s*-?\s*504|CP\s*-?\s*504.*INTENT\s+TO\s+LEVY/,
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
    
    // LT1058 - Intent to terminate installment agreement (not LT11 levy letter)
    {
      pattern: /\bLT-?\s*1058\b|\bLT\s+1058\b|TERMINATE.*INSTALLMENT AGREEMENT|DEFAULT.*PAYMENT PLAN/,
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

  const priorityHit = matchPriorityNoticeTypes(inputText, classifications);
  if (priorityHit) {
    return toClassificationResult(priorityHit, "priority_pattern", "high");
  }

  const headerCodeRaw = extractNoticeLineCode(inputText);
  if (headerCodeRaw) {
    const normHeader = normalizeNoticeHeaderCode(headerCodeRaw);
    if (normHeader.length >= 2) {
      const byHeader = classifications.find(
        (c) => normalizeNoticeHeaderCode(c.noticeType) === normHeader
      );
      if (byHeader) {
        return toClassificationResult(byHeader, "notice_header_line", "high");
      }
      const shortType = normHeader.length <= 14 ? normHeader : normHeader.slice(0, 14);
      return {
        noticeType: shortType,
        urgencyLevel: "medium",
        responseRequired: true,
        typicalDeadlineDays: 30,
        escalationRisk: [
          "Unknown escalation path — review full notice text",
          "Consult a tax professional for notice-specific guidance"
        ],
        category: "UNKNOWN",
        description: `IRS notice ${headerCodeRaw.trim()} (from notice header line)`,
        confidence: "high",
        detectionMethod: "notice_header_line"
      };
    }
  }
  
  // Find matching classification
  for (const classification of classifications) {
    if (classification.pattern.test(text)) {
      return toClassificationResult(classification, "pattern_match", "high");
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

const TAX_YEAR_REGEXES = [
  /\btax\s+year\s*:?\s*(\d{4})\b/i,
  /\bfor\s+(?:the\s+)?(?:tax\s+)?year\s+(\d{4})\b/i,
  /\b(\d{4})\s+(?:federal\s+)?(?:income\s+)?tax\s+return\b/i,
  /\btaxable\s+year\s+(?:ended?\s+)?(?:\w+\s+\d+,?\s+)?(\d{4})\b/i,
  /\bperiod\s+(?:ending\s+)?(?:\w+\s+\d+,?\s+)?(\d{4})\b/i,
  /\byour\s+(\d{4})\s+(?:tax|return|Form)/i,
  /(?:tax\s+)?period\s+(?:ending\s+)?(\d{4})/i,
  /(\d{4})\s+tax\s+(?:year|return)/i,
  /(?:your\s+)?(\d{4})\s+(?:federal\s+)?(?:income\s+)?tax/i,
  /tax\s+return.*?(\d{4})/i,
  /(?:Form\s+1040.*?)(\d{4})/i,
  /notice.*?(\d{4})\s+tax/i
];

function isValidTaxYearDigits(yearStr) {
  const y = parseInt(yearStr, 10);
  const maxY = new Date().getFullYear();
  return !Number.isNaN(y) && y >= 2010 && y <= maxY;
}

/**
 * First plausible tax year on the notice (2010 … current calendar year).
 * @param {string} inputText
 * @returns {string|null}
 */
function extractPrimaryTaxYearFromText(inputText) {
  if (!inputText || typeof inputText !== "string") return null;
  for (const re of TAX_YEAR_REGEXES) {
    const m = inputText.match(re);
    if (m && m[1] && isValidTaxYearDigits(m[1])) return String(parseInt(m[1], 10));
  }
  const reY = /\b(20\d{2})\b/g;
  let mm;
  while ((mm = reY.exec(inputText)) !== null) {
    if (isValidTaxYearDigits(mm[1])) return mm[1];
  }
  return null;
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
  
  const taxYear = extractPrimaryTaxYearFromText(inputText);

  return {
    allAmounts: amounts,
    largestAmount: amounts.length > 0 ? Math.max(...amounts) : null,
    balanceDue: balanceDue,
    proposedChange: proposedChange,
    penaltiesAndInterest: penaltiesAndInterest,
    financialImpact: balanceDue && balanceDue > 25000 ? "HIGH" : 
                     balanceDue && balanceDue > 5000 ? "MEDIUM" : "LOW",
    taxYear
  };
}

module.exports = {
  classifyIRSNotice,
  extractDeadlineInfo,
  extractFinancialInfo,
  extractPrimaryTaxYearFromText
};

