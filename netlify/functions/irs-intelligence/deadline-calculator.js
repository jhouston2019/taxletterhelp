/**
 * DEADLINE & ESCALATION INTELLIGENCE
 * 
 * Purpose: Calculates exact response windows and predicts escalation sequences
 * based on IRS notice type and timeline.
 * 
 * Why this matters:
 * - Users need to understand consequences of inaction
 * - Deadlines are strict and missing them has severe consequences
 * - Escalation paths are predictable and should be communicated clearly
 */

/**
 * Calculates deadline information and urgency
 * @param {Object} classification - Notice classification from classification engine
 * @param {Object} deadlineInfo - Extracted deadline information
 * @returns {Object} Complete deadline analysis
 */
function calculateDeadlineIntelligence(classification, deadlineInfo) {
  const { noticeType, typicalDeadlineDays } = classification;
  const { deadlineDate, daysRemaining, daysFromNoticeDate } = deadlineInfo;
  
  // Use extracted deadline if available, otherwise use typical deadline
  const effectiveDaysRemaining = daysRemaining !== null ? 
    daysRemaining : 
    (daysFromNoticeDate || typicalDeadlineDays);
  
  // Calculate urgency level
  let urgencyLevel = "NORMAL";
  let urgencyMessage = "";
  
  if (effectiveDaysRemaining <= 3) {
    urgencyLevel = "CRITICAL";
    urgencyMessage = "IMMEDIATE ACTION REQUIRED - Deadline is within 3 days";
  } else if (effectiveDaysRemaining <= 7) {
    urgencyLevel = "URGENT";
    urgencyMessage = "URGENT - Less than one week to respond";
  } else if (effectiveDaysRemaining <= 14) {
    urgencyLevel = "HIGH";
    urgencyMessage = "HIGH PRIORITY - Less than two weeks to respond";
  } else if (effectiveDaysRemaining <= 21) {
    urgencyLevel = "MODERATE";
    urgencyMessage = "MODERATE PRIORITY - Three weeks to respond";
  } else {
    urgencyLevel = "NORMAL";
    urgencyMessage = "NORMAL PRIORITY - Adequate time to respond";
  }
  
  // Calculate recommended action date (5 days before deadline as buffer)
  const recommendedActionDays = Math.max(1, effectiveDaysRemaining - 5);
  
  return {
    deadlineDate: deadlineDate,
    daysRemaining: effectiveDaysRemaining,
    urgencyLevel: urgencyLevel,
    urgencyMessage: urgencyMessage,
    recommendedActionDate: recommendedActionDays,
    recommendedActionMessage: `Recommended to respond within ${recommendedActionDays} days to allow for processing time`,
    isOverdue: effectiveDaysRemaining < 0,
    overdueMessage: effectiveDaysRemaining < 0 ? 
      `This deadline has passed by ${Math.abs(effectiveDaysRemaining)} days. Immediate action required.` : 
      null
  };
}

/**
 * Generates escalation timeline based on notice type
 * @param {Object} classification - Notice classification
 * @param {Object} deadlineIntel - Deadline intelligence
 * @returns {Object} Escalation timeline and consequences
 */
function generateEscalationTimeline(classification, deadlineIntel) {
  const { noticeType, escalationRisk } = classification;
  const { daysRemaining } = deadlineIntel;
  
  // Define escalation sequences by notice type
  const escalationSequences = {
    CP2000: [
      {
        stage: "Current",
        days: 0,
        action: "CP2000 Proposed Assessment",
        consequence: "Opportunity to agree, disagree, or partially agree with proposed changes"
      },
      {
        stage: "If No Response",
        days: 30,
        action: "Proposed changes become assessment",
        consequence: "Amount becomes legally owed, penalties and interest continue to accrue"
      },
      {
        stage: "60 Days",
        days: 60,
        action: "Statutory Notice of Deficiency (90-day letter)",
        consequence: "Final opportunity to petition Tax Court, otherwise assessment becomes final"
      },
      {
        stage: "150 Days",
        days: 150,
        action: "Assessment becomes final",
        consequence: "Collection action begins, limited appeal rights remain"
      },
      {
        stage: "180+ Days",
        days: 180,
        action: "Collection notices begin (CP14)",
        consequence: "Balance due notices, potential levy action"
      }
    ],
    
    CP14: [
      {
        stage: "Current",
        days: 0,
        action: "CP14 - First Balance Due Notice",
        consequence: "Opportunity to pay, set up payment plan, or dispute"
      },
      {
        stage: "If No Response",
        days: 30,
        action: "CP501 - First Reminder",
        consequence: "Penalties and interest continue to accrue"
      },
      {
        stage: "60 Days",
        days: 60,
        action: "CP503 - Second Reminder",
        consequence: "Increased urgency, potential lien filing"
      },
      {
        stage: "90 Days",
        days: 90,
        action: "CP504 - Intent to Levy",
        consequence: "Final notice before levy action, 30 days to respond"
      },
      {
        stage: "120+ Days",
        days: 120,
        action: "Levy Action",
        consequence: "Bank levy, wage garnishment, or asset seizure"
      }
    ],
    
    CP501: [
      {
        stage: "Current",
        days: 0,
        action: "CP501 - First Reminder",
        consequence: "Escalation from CP14, increased urgency"
      },
      {
        stage: "If No Response",
        days: 30,
        action: "CP503 - Second Reminder",
        consequence: "Potential lien filing, levy action imminent"
      },
      {
        stage: "60 Days",
        days: 60,
        action: "CP504 - Intent to Levy",
        consequence: "Final notice, 30 days before levy"
      },
      {
        stage: "90+ Days",
        days: 90,
        action: "Levy Action",
        consequence: "Bank levy, wage garnishment, asset seizure"
      }
    ],
    
    CP503: [
      {
        stage: "Current",
        days: 0,
        action: "CP503 - Second Reminder",
        consequence: "Critical stage, levy action imminent"
      },
      {
        stage: "If No Response",
        days: 21,
        action: "CP504 - Intent to Levy",
        consequence: "Final notice before levy, 30 days to respond"
      },
      {
        stage: "51+ Days",
        days: 51,
        action: "Levy Action",
        consequence: "Bank levy, wage garnishment, or asset seizure without further notice"
      }
    ],
    
    CP504: [
      {
        stage: "Current",
        days: 0,
        action: "CP504 - Intent to Levy (Final Notice)",
        consequence: "Last opportunity to prevent levy, file Form 12153 for hearing"
      },
      {
        stage: "If No Response",
        days: 30,
        action: "Levy Action Authorized",
        consequence: "IRS can levy bank accounts, garnish wages, seize assets"
      },
      {
        stage: "30+ Days",
        days: 30,
        action: "Active Collection Enforcement",
        consequence: "Bank levies, wage garnishments, asset seizures, liens"
      }
    ],
    
    CP75: [
      {
        stage: "Current",
        days: 0,
        action: "Audit Notice Received",
        consequence: "Opportunity to prepare and respond with documentation"
      },
      {
        stage: "If No Response",
        days: 30,
        action: "Proposed Assessment",
        consequence: "IRS proposes changes based on available information"
      },
      {
        stage: "60 Days",
        days: 60,
        action: "Statutory Notice of Deficiency",
        consequence: "90 days to petition Tax Court"
      },
      {
        stage: "150+ Days",
        days: 150,
        action: "Assessment Becomes Final",
        consequence: "Collection action begins, limited appeal rights"
      }
    ],
    
    AUDIT_LETTER: [
      {
        stage: "Current",
        days: 0,
        action: "Formal Audit Examination",
        consequence: "Must respond and provide requested documentation"
      },
      {
        stage: "If No Cooperation",
        days: 30,
        action: "Summons Issued",
        consequence: "Legal requirement to appear and provide records"
      },
      {
        stage: "60 Days",
        days: 60,
        action: "Proposed Assessment",
        consequence: "IRS proposes changes, potential penalties"
      },
      {
        stage: "90+ Days",
        days: 90,
        action: "Statutory Notice of Deficiency",
        consequence: "Final opportunity to petition Tax Court"
      }
    ],
    
    IDENTITY_VERIFICATION: [
      {
        stage: "Current",
        days: 0,
        action: "Identity Verification Required",
        consequence: "Refund on hold until identity verified"
      },
      {
        stage: "If No Response",
        days: 30,
        action: "Return Marked as Fraudulent",
        consequence: "Refund denied, future returns flagged"
      },
      {
        stage: "60+ Days",
        days: 60,
        action: "Permanent Fraud Flag",
        consequence: "All future returns require manual verification"
      }
    ]
  };
  
  // Get escalation sequence for this notice type
  const sequence = escalationSequences[noticeType] || [
    {
      stage: "Current",
      days: 0,
      action: "Notice Received",
      consequence: "Response required within typical deadline"
    },
    {
      stage: "If No Response",
      days: 30,
      action: "Escalation Likely",
      consequence: "Additional notices or collection action"
    },
    {
      stage: "60+ Days",
      days: 60,
      action: "Enforcement Action",
      consequence: "Penalties, liens, or levy action possible"
    }
  ];
  
  return {
    currentStage: sequence[0],
    escalationSequence: sequence,
    nextEscalation: sequence[1],
    finalConsequence: sequence[sequence.length - 1],
    escalationRisks: escalationRisk,
    timelineWarning: generateTimelineWarning(noticeType, daysRemaining)
  };
}

/**
 * Generates a specific warning based on notice type and time remaining
 * @param {string} noticeType - The notice type
 * @param {number} daysRemaining - Days remaining to respond
 * @returns {string} Tailored warning message
 */
function generateTimelineWarning(noticeType, daysRemaining) {
  if (daysRemaining <= 3) {
    return `CRITICAL: You have ${daysRemaining} days remaining. Immediate action required today.`;
  }
  
  if (daysRemaining <= 7) {
    return `URGENT: You have less than one week to respond. Do not delay.`;
  }
  
  if (daysRemaining <= 14) {
    return `HIGH PRIORITY: You have ${daysRemaining} days to respond. Begin preparation immediately.`;
  }
  
  if (daysRemaining <= 21) {
    return `MODERATE PRIORITY: You have ${daysRemaining} days to respond. Start gathering documentation.`;
  }
  
  return `You have ${daysRemaining} days to respond. Plan your response carefully.`;
}

/**
 * Generates "what happens if" scenarios
 * @param {Object} classification - Notice classification
 * @param {Object} escalationTimeline - Escalation timeline
 * @returns {Object} Scenario analysis
 */
function generateScenarios(classification, escalationTimeline) {
  const { noticeType } = classification;
  
  return {
    ifNoAction: {
      title: "If You Take No Action",
      timeline: escalationTimeline.escalationSequence,
      summary: `If you do not respond to this ${noticeType} notice, here is the likely sequence of events:`,
      consequences: escalationTimeline.escalationSequence.map(stage => 
        `${stage.stage} (${stage.days} days): ${stage.action} - ${stage.consequence}`
      )
    },
    
    ifPartialResponse: {
      title: "If You Respond Incorrectly or Incompletely",
      risks: [
        "IRS may reject incomplete responses and proceed with proposed action",
        "Missing deadlines due to back-and-forth communication",
        "Weakened position for appeals or disputes",
        "Additional penalties for inadequate response",
        "Loss of credibility with IRS examiner"
      ]
    },
    
    ifCorrectResponse: {
      title: "If You Respond Correctly and Timely",
      benefits: [
        "Opportunity to resolve issue without escalation",
        "Potential reduction or elimination of proposed changes",
        "Preservation of appeal rights",
        "Avoidance of additional penalties and interest",
        "Positive resolution within 30-90 days (typically)"
      ]
    }
  };
}

/**
 * Main function to generate complete deadline and escalation intelligence
 * @param {Object} classification - Notice classification
 * @param {Object} deadlineInfo - Extracted deadline information
 * @returns {Object} Complete deadline and escalation analysis
 */
function generateDeadlineIntelligence(classification, deadlineInfo) {
  const deadlineIntel = calculateDeadlineIntelligence(classification, deadlineInfo);
  const escalationTimeline = generateEscalationTimeline(classification, deadlineIntel);
  const scenarios = generateScenarios(classification, escalationTimeline);
  
  return {
    deadline: deadlineIntel,
    escalation: escalationTimeline,
    scenarios: scenarios,
    criticalWarning: deadlineIntel.urgencyLevel === "CRITICAL" || deadlineIntel.urgencyLevel === "URGENT" ?
      `⚠️ ${deadlineIntel.urgencyMessage} - ${escalationTimeline.timelineWarning}` :
      null
  };
}

module.exports = {
  calculateDeadlineIntelligence,
  generateEscalationTimeline,
  generateScenarios,
  generateDeadlineIntelligence
};

