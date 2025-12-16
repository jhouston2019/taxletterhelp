// CORE INTELLIGENCE — DO NOT MODIFY WITHOUT TEST SUITE
/**
 * EVIDENCE MAPPING SYSTEM
 * 
 * Purpose: Maps user-provided evidence to specific claims and provides
 * explicit guidance on what to attach vs. summarize vs. exclude.
 * 
 * Why this is safer than general AI:
 * - Document-by-document analysis (not generic "attach docs")
 * - Explicit ATTACH/SUMMARIZE/EXCLUDE decisions
 * - Over-disclosure prevention (blocks full bank statements)
 * - Audit expansion warnings (no prior year returns)
 * 
 * Where logic overrides AI:
 * - Document type detection (pattern matching)
 * - Attachment decision rules (deterministic)
 * - Redaction requirements (rule-based)
 * - Over-disclosure warnings (predefined)
 */

/**
 * Analyzes uploaded documents and maps them to notice issues
 * @param {Array} documents - Array of document objects with type and description
 * @param {Object} classification - Notice classification
 * @param {Object} playbook - Notice-specific playbook
 * @returns {Object} Evidence mapping and attachment guidance
 */
function mapEvidence(documents, classification, playbook) {
  const { noticeType } = classification;
  const { evidenceTypes } = playbook;
  
  const evidenceMap = {
    toAttach: [],
    toSummarize: [],
    toExclude: [],
    warnings: [],
    recommendations: []
  };
  
  // Analyze each document
  documents.forEach(doc => {
    const analysis = analyzeDocument(doc, noticeType, evidenceTypes);
    
    if (analysis.action === "ATTACH") {
      evidenceMap.toAttach.push({
        document: doc,
        reason: analysis.reason,
        supports: analysis.supports,
        instructions: analysis.instructions
      });
    } else if (analysis.action === "SUMMARIZE") {
      evidenceMap.toSummarize.push({
        document: doc,
        reason: analysis.reason,
        howToSummarize: analysis.instructions
      });
    } else if (analysis.action === "EXCLUDE") {
      evidenceMap.toExclude.push({
        document: doc,
        reason: analysis.reason,
        warning: analysis.warning
      });
    }
    
    if (analysis.warnings) {
      evidenceMap.warnings.push(...analysis.warnings);
    }
  });
  
  // Add general recommendations
  evidenceMap.recommendations = generateEvidenceRecommendations(
    noticeType, 
    evidenceMap.toAttach.length,
    evidenceMap.toExclude.length
  );
  
  return evidenceMap;
}

/**
 * Analyzes a single document to determine how it should be used
 * @param {Object} doc - Document object
 * @param {string} noticeType - Type of IRS notice
 * @param {Array} allowedEvidenceTypes - Allowed evidence types from playbook
 * @returns {Object} Analysis result with action and reasoning
 */
function analyzeDocument(doc, noticeType, allowedEvidenceTypes) {
  const docType = doc.type ? doc.type.toUpperCase() : "";
  const docName = doc.name ? doc.name.toUpperCase() : "";
  const docDescription = doc.description ? doc.description.toUpperCase() : "";
  
  // W-2 Analysis
  if (docType.includes("W-2") || docName.includes("W-2") || docDescription.includes("W-2")) {
    if (noticeType === "CP2000" || noticeType === "CP2001") {
      return {
        action: "ATTACH",
        reason: "W-2 directly supports income reporting",
        supports: "Wage income verification",
        instructions: "Attach complete W-2. Highlight any discrepancies between W-2 and IRS records."
      };
    }
    return {
      action: "ATTACH",
      reason: "W-2 is standard supporting documentation",
      supports: "Income verification",
      instructions: "Attach complete W-2 form"
    };
  }
  
  // 1099 Forms Analysis
  if (docType.includes("1099") || docName.includes("1099") || docDescription.includes("1099")) {
    const form1099Type = extract1099Type(docName + " " + docDescription);
    
    if (noticeType === "CP2000") {
      return {
        action: "ATTACH",
        reason: `Form ${form1099Type} directly addresses CP2000 income discrepancy`,
        supports: "Underreported income explanation",
        instructions: `Attach Form ${form1099Type}. If this corrects IRS records, include explanation of why IRS data is incorrect. If this was not included in original return, explain why.`,
        warnings: ["If this 1099 was not reported, file amended return (Form 1040-X)"]
      };
    }
    
    return {
      action: "ATTACH",
      reason: "1099 form supports income reporting",
      supports: "Income verification",
      instructions: `Attach Form ${form1099Type}`
    };
  }
  
  // Bank Statements Analysis
  if (docType.includes("BANK") || docName.includes("BANK") || docDescription.includes("BANK STATEMENT")) {
    return {
      action: "SUMMARIZE",
      reason: "Bank statements contain sensitive information and should not be provided in full unless specifically requested",
      howToSummarize: "Create a summary showing only the specific transactions relevant to the issue. Redact account numbers and unrelated transactions.",
      warnings: [
        "⚠️ DO NOT attach full bank statements unless IRS specifically requests them",
        "⚠️ Only provide specific transactions that support your position",
        "⚠️ Redact sensitive information (account numbers, unrelated transactions)"
      ]
    };
  }
  
  // Receipt Analysis
  if (docType.includes("RECEIPT") || docName.includes("RECEIPT") || docDescription.includes("RECEIPT")) {
    if (noticeType === "CP2000" || noticeType.includes("AUDIT")) {
      return {
        action: "ATTACH",
        reason: "Receipts support deductions or expenses",
        supports: "Expense verification",
        instructions: "Attach receipts. Organize by category and create a summary sheet listing each receipt with date, amount, and purpose."
      };
    }
    return {
      action: "SUMMARIZE",
      reason: "Receipts may not be relevant to this notice type",
      howToSummarize: "List receipt totals by category if relevant to the issue"
    };
  }
  
  // Schedule C / Business Records
  if (docType.includes("SCHEDULE C") || docName.includes("SCHEDULE C") || docDescription.includes("BUSINESS")) {
    if (noticeType === "CP2000" || noticeType.includes("AUDIT")) {
      return {
        action: "ATTACH",
        reason: "Schedule C supports business income and expenses",
        supports: "Business income/expense verification",
        instructions: "Attach Schedule C and supporting documentation. Organize by income sources and expense categories."
      };
    }
    return {
      action: "ATTACH",
      reason: "Business records may be relevant",
      supports: "Business activity verification",
      instructions: "Attach relevant business records"
    };
  }
  
  // Prior Year Returns
  if (docType.includes("TAX RETURN") || docName.includes("RETURN") || docDescription.includes("PRIOR YEAR")) {
    return {
      action: "EXCLUDE",
      reason: "Prior year returns should NOT be provided unless specifically requested by IRS",
      warning: "⚠️ CRITICAL: Do not volunteer prior year tax returns. This can trigger audits of other years.",
      warnings: [
        "Do not provide prior year returns unless IRS specifically requests them",
        "Providing unrequested returns can expand audit scope",
        "Only provide the specific year under examination"
      ]
    };
  }
  
  // Correspondence with IRS
  if (docType.includes("IRS") || docName.includes("IRS") || docDescription.includes("IRS LETTER")) {
    return {
      action: "ATTACH",
      reason: "Prior IRS correspondence provides context",
      supports: "Communication history",
      instructions: "Attach prior IRS letters in chronological order. Reference specific dates and notice numbers in your response."
    };
  }
  
  // Correspondence with Payers
  if (docDescription.includes("EMPLOYER") || docDescription.includes("PAYER") || docDescription.includes("COMPANY")) {
    if (noticeType === "CP2000") {
      return {
        action: "ATTACH",
        reason: "Correspondence with payers can explain discrepancies",
        supports: "Income reporting clarification",
        instructions: "Attach correspondence. Highlight portions that explain the discrepancy between your return and IRS records."
      };
    }
    return {
      action: "SUMMARIZE",
      reason: "Correspondence may contain irrelevant information",
      howToSummarize: "Summarize key points from correspondence. Quote specific relevant passages."
    };
  }
  
  // Medical Records / Personal Documents
  if (docType.includes("MEDICAL") || docType.includes("PERSONAL") || docDescription.includes("MEDICAL")) {
    return {
      action: "EXCLUDE",
      reason: "Medical and personal records should not be provided unless specifically requested",
      warning: "⚠️ Do not provide medical or personal records unless IRS specifically requests them for hardship determination",
      warnings: [
        "Medical records are not typically relevant to tax notices",
        "Only provide if IRS specifically requests for hardship or penalty abatement",
        "Redact sensitive health information if providing"
      ]
    };
  }
  
  // Financial Hardship Documentation
  if (docDescription.includes("HARDSHIP") || docDescription.includes("FINANCIAL STATEMENT")) {
    if (noticeType === "CP504" || noticeType === "CP503" || noticeType === "CP501") {
      return {
        action: "ATTACH",
        reason: "Financial hardship documentation supports payment plan or Currently Not Collectible status request",
        supports: "Hardship claim",
        instructions: "Attach Form 433-A or 433-F (Collection Information Statement) with supporting documentation. Include proof of income, expenses, and assets."
      };
    }
    return {
      action: "EXCLUDE",
      reason: "Financial hardship documentation not relevant to this notice type",
      warning: "Only provide financial information when requesting payment arrangements or hardship status"
    };
  }
  
  // Default: Unknown document type
  return {
    action: "SUMMARIZE",
    reason: "Document type unclear - summarize to avoid over-disclosure",
    howToSummarize: "Describe the document and explain how it supports your position. Do not attach unless certain it is relevant.",
    warnings: ["Unclear document type - verify relevance before including"]
  };
}

/**
 * Extracts specific 1099 form type from text
 * @param {string} text - Text to analyze
 * @returns {string} Specific 1099 type or "1099"
 */
function extract1099Type(text) {
  const types = ["1099-K", "1099-MISC", "1099-NEC", "1099-INT", "1099-DIV", "1099-R", "1099-G"];
  
  for (const type of types) {
    if (text.includes(type)) {
      return type;
    }
  }
  
  return "1099";
}

/**
 * Generates evidence recommendations based on notice type and current evidence
 * @param {string} noticeType - Type of IRS notice
 * @param {number} attachCount - Number of documents to attach
 * @param {number} excludeCount - Number of documents to exclude
 * @returns {Array} Array of recommendation strings
 */
function generateEvidenceRecommendations(noticeType, attachCount, excludeCount) {
  const recommendations = [];
  
  // General recommendations
  recommendations.push("Create a cover letter listing all attached documents with brief descriptions");
  recommendations.push("Number each attachment and reference by number in your response letter");
  recommendations.push("Make copies of everything before sending - never send originals");
  recommendations.push("Send via certified mail with return receipt requested");
  
  // Notice-specific recommendations
  if (noticeType === "CP2000") {
    recommendations.push("For each line item on CP2000, reference specific attached document that supports your position");
    recommendations.push("If agreeing with some changes, clearly separate agreed vs. disputed items");
    recommendations.push("Include Form 1040X (Amended Return) if you discovered additional errors");
  }
  
  if (noticeType === "CP14" || noticeType === "CP501" || noticeType === "CP503") {
    recommendations.push("If requesting payment plan, include Form 9465 (Installment Agreement Request)");
    recommendations.push("If requesting penalty abatement, include written explanation of reasonable cause");
    recommendations.push("If disputing amount, include documentation showing payment or calculation error");
  }
  
  if (noticeType === "CP504") {
    recommendations.push("Include Form 12153 (Request for Collection Due Process Hearing) if disputing collection action");
    recommendations.push("Include Form 433-A or 433-F if requesting Currently Not Collectible status");
    recommendations.push("Include Form 656 if submitting Offer in Compromise");
  }
  
  if (noticeType === "CP75" || noticeType === "AUDIT_LETTER") {
    recommendations.push("Organize documents by tax return line item");
    recommendations.push("Create an index of all documents provided");
    recommendations.push("Only provide documents specifically requested in the audit notice");
    recommendations.push("File Form 2848 (Power of Attorney) to authorize representative");
  }
  
  // Warnings based on document counts
  if (attachCount === 0) {
    recommendations.push("⚠️ WARNING: No documents to attach. Gather supporting documentation before responding.");
  }
  
  if (excludeCount > 3) {
    recommendations.push("⚠️ GOOD: You are correctly excluding documents that could harm your case or expand the scope.");
  }
  
  if (attachCount > 20) {
    recommendations.push("⚠️ CAUTION: Multiple documents to attach. Create summary sheet for IRS reviewer.");
  }
  
  return recommendations;
}

/**
 * Generates specific attachment instructions for response letter
 * @param {Object} evidenceMap - Complete evidence mapping
 * @param {string} noticeType - Type of IRS notice
 * @returns {string} Formatted attachment instructions for letter
 */
function generateAttachmentInstructions(evidenceMap, noticeType) {
  let instructions = "SUPPORTING DOCUMENTATION:\n\n";
  
  if (evidenceMap.toAttach.length > 0) {
    instructions += "The following documents are attached to support this response:\n\n";
    evidenceMap.toAttach.forEach((item, index) => {
      instructions += `Attachment ${index + 1}: ${item.document.name}\n`;
      instructions += `   Purpose: ${item.supports}\n`;
      instructions += `   ${item.instructions}\n\n`;
    });
  }
  
  if (evidenceMap.toSummarize.length > 0) {
    instructions += "\nThe following information is summarized below (full documents available upon request):\n\n";
    evidenceMap.toSummarize.forEach((item, index) => {
      instructions += `${index + 1}. ${item.document.name}\n`;
      instructions += `   ${item.howToSummarize}\n\n`;
    });
  }
  
  if (evidenceMap.warnings.length > 0) {
    instructions += "\n⚠️ IMPORTANT WARNINGS:\n\n";
    evidenceMap.warnings.forEach((warning, index) => {
      instructions += `${index + 1}. ${warning}\n`;
    });
  }
  
  return instructions;
}

/**
 * Validates evidence against notice requirements
 * @param {Object} evidenceMap - Complete evidence mapping
 * @param {Object} playbook - Notice-specific playbook
 * @returns {Object} Validation result
 */
function validateEvidence(evidenceMap, playbook) {
  const { requiredElements } = playbook;
  const missingElements = [];
  const providedElements = [];
  
  // Check if evidence covers required elements
  requiredElements.forEach(element => {
    const elementLower = element.toLowerCase();
    let found = false;
    
    evidenceMap.toAttach.forEach(item => {
      if (item.supports.toLowerCase().includes(elementLower) || 
          item.reason.toLowerCase().includes(elementLower)) {
        found = true;
      }
    });
    
    if (found) {
      providedElements.push(element);
    } else {
      missingElements.push(element);
    }
  });
  
  return {
    isComplete: missingElements.length === 0,
    providedElements: providedElements,
    missingElements: missingElements,
    completionPercentage: Math.round((providedElements.length / requiredElements.length) * 100),
    message: missingElements.length === 0 ?
      "All required elements are supported by evidence" :
      `Missing evidence for: ${missingElements.join(', ')}`
  };
}

module.exports = {
  mapEvidence,
  analyzeDocument,
  generateEvidenceRecommendations,
  generateAttachmentInstructions,
  validateEvidence
};

