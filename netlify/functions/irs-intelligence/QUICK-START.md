# IRS Response Intelligence System - Quick Start Guide

## Overview

This guide will help you quickly understand and use the IRS Response Intelligence System.

## 5-Minute Quick Start

### 1. Analyze an IRS Letter

```javascript
const { analyzeIRSLetter } = require('./irs-intelligence/index.js');

// Analyze letter text
const result = await analyzeIRSLetter(letterText);

// Get key information
console.log('Notice Type:', result.classification.noticeType);
console.log('Days Remaining:', result.deadlineIntelligence.deadline.daysRemaining);
console.log('Urgency:', result.classification.urgencyLevel);
console.log('Professional Help Needed:', result.professionalHelpAssessment.recommendProfessional);

// Get formatted output
console.log(result.analysisOutput);
```

### 2. Generate a Response Letter

```javascript
const { generateIRSResponse } = require('./irs-intelligence/index.js');
const OpenAI = require('openai');

// First, analyze the letter
const analysisResult = await analyzeIRSLetter(letterText);

// Create AI generation function
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const aiGenerateFunction = async (systemPrompt, userPrompt) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
  });
  return completion.choices[0].message.content.trim();
};

// Generate response
const responseResult = await generateIRSResponse(
  analysisResult,
  {
    stance: "partial_dispute",
    explanation: "I agree with items 1 and 2, but dispute item 3...",
    requestedAction: "Adjust the proposed assessment"
  },
  aiGenerateFunction
);

// Check for warnings
if (responseResult.warning) {
  console.log('WARNING:', responseResult.message);
} else {
  console.log('Response Letter:', responseResult.responseLetter);
  console.log('Risk Level:', responseResult.riskAnalysis.overallRisk);
}
```

## Key Concepts

### 1. Notice Classification

The system identifies IRS notice types using **deterministic pattern matching** (not AI):

```javascript
const { classifyIRSNotice } = require('./irs-intelligence/classification-engine.js');

const classification = classifyIRSNotice(letterText);
// Returns: { noticeType, urgencyLevel, responseRequired, typicalDeadlineDays, escalationRisk, ... }
```

**Supported Notice Types**:
- CP2000, CP2001 (Underreported Income)
- CP14, CP501, CP503, CP504 (Balance Due)
- CP75, Audit Letters (Examination)
- CP90, CP297, Letter 1058 (Levy)
- 5071C, 5747C, 4883C (Identity Verification)

### 2. Playbooks

Each notice type has a **playbook** with specific requirements:

```javascript
const { getPlaybook } = require('./irs-intelligence/response-playbooks.js');

const playbook = getPlaybook('CP2000');
// Returns: { allowedUserPositions, requiredElements, prohibitedLanguage, requiredTone, ... }
```

**Playbook Components**:
- Allowed user positions (agree, dispute, partial, etc.)
- Required elements (what must be in the response)
- Prohibited language (what NOT to say)
- Evidence types (what documents are appropriate)
- Response structure (how to format the letter)

### 3. Risk Guardrails

The system analyzes text for **dangerous language**:

```javascript
const { analyzeRisks } = require('./irs-intelligence/risk-guardrails.js');

const risks = analyzeRisks(userText, classification);
// Returns: { admissionsOfFault, overDisclosure, legalMisstatements, safetyScore, overallRisk }
```

**Risk Categories**:
- Admissions of fault ("I forgot", "I didn't report")
- Over-disclosure (volunteering other years)
- Legal misstatements (incorrect claims)
- Aggressive language (confrontational tone)

**Safety Score**: 0-100
- 100: No risks detected
- 80-99: Low risk
- 60-79: Medium risk
- 40-59: High risk
- <40: Critical risk (professional review mandatory)

### 4. Evidence Mapping

The system provides **document-specific guidance**:

```javascript
const { mapEvidence } = require('./irs-intelligence/evidence-mapper.js');

const evidenceMap = mapEvidence(documents, classification, playbook);
// Returns: { toAttach, toSummarize, toExclude, warnings, recommendations }
```

**Actions**:
- **ATTACH**: W-2s, 1099s, receipts (when relevant)
- **SUMMARIZE**: Bank statements (never attach full)
- **EXCLUDE**: Prior year returns, medical records

### 5. Deadline Intelligence

The system calculates **exact escalation timelines**:

```javascript
const { generateDeadlineIntelligence } = require('./irs-intelligence/deadline-calculator.js');

const deadlineIntel = generateDeadlineIntelligence(classification, deadlineInfo);
// Returns: { deadline, escalation, scenarios }
```

**Output**:
- Days remaining to respond
- Urgency level (CRITICAL, URGENT, HIGH, MODERATE, NORMAL)
- Stage-by-stage escalation sequence
- "What happens if" scenarios

## Common Use Cases

### Use Case 1: Quick Notice Analysis

```javascript
// User uploads IRS letter, wants to know what it is
const result = await analyzeIRSLetter(letterText);

// Show user the formatted analysis
displayToUser(result.analysisOutput);

// Show urgency indicator
if (result.deadlineIntelligence.deadline.urgencyLevel === 'CRITICAL') {
  showUrgentAlert('Immediate action required!');
}
```

### Use Case 2: Generate Response with Safety Checks

```javascript
// User wants to generate a response
const analysisResult = await analyzeIRSLetter(letterText);

// User provides their position
const userPosition = {
  stance: "full_dispute",
  explanation: userInput,
  requestedAction: "Dismiss the proposed assessment"
};

// Generate response with safety checks
const responseResult = await generateIRSResponse(
  analysisResult,
  userPosition,
  aiGenerateFunction
);

// Handle warnings
if (responseResult.warning) {
  showWarning(responseResult.message);
  showRiskReport(responseResult.riskReport);
  askUserToRevise();
} else {
  showResponseLetter(responseResult.responseLetter);
  
  // Show professional review recommendation
  if (responseResult.professionalReviewNeed.needsReview) {
    showProfessionalHelpRecommendation(
      responseResult.professionalReviewNeed.urgency,
      responseResult.professionalReviewNeed.reasons
    );
  }
}
```

### Use Case 3: Evidence Guidance

```javascript
// User has uploaded documents
const documents = [
  { type: 'W-2', name: 'W2_2023.pdf' },
  { type: 'bank_statement', name: 'Bank_Statement.pdf' },
  { type: 'tax_return', name: 'Prior_Year_Return.pdf' }
];

// Analyze with documents
const result = await analyzeIRSLetter(letterText, { documents });

// Show evidence guidance
const evidenceMap = result.evidenceMap;

console.log('ATTACH:', evidenceMap.toAttach);
// W-2 - supports income verification

console.log('SUMMARIZE:', evidenceMap.toSummarize);
// Bank statement - only specific transactions

console.log('EXCLUDE:', evidenceMap.toExclude);
// Prior year return - expands audit scope

// Show warnings
evidenceMap.warnings.forEach(warning => {
  showWarning(warning);
});
```

## Integration with Existing Code

### In `analyze-letter.js` (Netlify Function)

```javascript
// Import intelligence system
const { analyzeIRSLetter } = require('./irs-intelligence/index.js');

// Use in handler
const intelligenceResult = await analyzeIRSLetter(letterText, {
  documents: [],
  userContext: {}
});

// Format for existing UI (backward compatibility)
const structuredAnalysis = {
  letterType: intelligenceResult.classification.noticeType,
  summary: intelligenceResult.analysisOutput,
  // ... other fields for UI
};

return {
  statusCode: 200,
  body: JSON.stringify({ analysis: structuredAnalysis })
};
```

### In `generate-response.js` (Netlify Function)

```javascript
// Import intelligence system
const { generateIRSResponse, analyzeIRSLetter } = require('./irs-intelligence/index.js');

// Analyze first
const analysisResult = await analyzeIRSLetter(letterText);

// Generate response
const responseResult = await generateIRSResponse(
  analysisResult,
  userPosition,
  aiGenerateFunction
);

// Handle result
if (responseResult.warning) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      warning: true,
      message: responseResult.message,
      riskReport: responseResult.riskReport
    })
  };
}

return {
  statusCode: 200,
  body: JSON.stringify({
    letter: responseResult.responseLetter,
    riskAnalysis: responseResult.riskAnalysis,
    professionalReviewNeed: responseResult.professionalReviewNeed
  })
};
```

## Testing

### Test Classification

```javascript
const { classifyIRSNotice } = require('./irs-intelligence/classification-engine.js');

// Test CP2000 detection
const text1 = "CP2000 Notice - Proposed Changes to Your Tax Return";
const result1 = classifyIRSNotice(text1);
console.assert(result1.noticeType === 'CP2000');

// Test CP504 detection
const text2 = "CP504 - Intent to Levy - Final Notice";
const result2 = classifyIRSNotice(text2);
console.assert(result2.noticeType === 'CP504');
```

### Test Risk Detection

```javascript
const { analyzeRisks } = require('./irs-intelligence/risk-guardrails.js');

// Test admission detection
const riskyText = "I forgot to report that income";
const classification = { noticeType: 'CP2000' };
const risks = analyzeRisks(riskyText, classification);

console.assert(risks.admissionsOfFault.length > 0);
console.assert(risks.safetyScore < 80);
```

### Test Playbook

```javascript
const { getPlaybook, validateUserPosition } = require('./irs-intelligence/response-playbooks.js');

// Test playbook retrieval
const playbook = getPlaybook('CP2000');
console.assert(playbook.noticeType === 'CP2000');
console.assert(playbook.allowedUserPositions.includes('agree'));

// Test position validation
const validation = validateUserPosition('CP2000', 'agree');
console.assert(validation.valid === true);

const invalidValidation = validateUserPosition('CP2000', 'invalid_position');
console.assert(invalidValidation.valid === false);
```

## Troubleshooting

### Issue: Classification returns "UNKNOWN"

**Cause**: Notice type pattern not recognized

**Solution**:
1. Check if notice number is in the text
2. Add new pattern to `classification-engine.js`
3. Create playbook entry for new notice type

### Issue: Risk analysis too sensitive

**Cause**: Pattern matching is aggressive

**Solution**:
1. Review flagged patterns in `risk-guardrails.js`
2. Adjust risk levels (CRITICAL → HIGH)
3. Add exceptions for specific contexts

### Issue: Evidence mapping incorrect

**Cause**: Document type not recognized

**Solution**:
1. Check document type detection in `evidence-mapper.js`
2. Add new document type patterns
3. Define attach/summarize/exclude rules

## Best Practices

### 1. Always Check for Warnings

```javascript
const responseResult = await generateIRSResponse(...);

if (responseResult.warning) {
  // Show warning to user
  // Ask them to revise
  // Do NOT proceed without user acknowledgment
}
```

### 2. Respect Professional Help Recommendations

```javascript
if (professionalReviewNeed.urgency === 'MANDATORY') {
  // Block user from proceeding
  // Require professional consultation
}

if (professionalReviewNeed.urgency === 'STRONGLY_RECOMMENDED') {
  // Show strong warning
  // Allow user to proceed with acknowledgment
}
```

### 3. Preserve Evidence Warnings

```javascript
evidenceMap.warnings.forEach(warning => {
  // Show each warning prominently
  // Require user acknowledgment
  // Log for compliance
});
```

### 4. Log Risk Scores

```javascript
// Log for monitoring and improvement
logRiskAnalysis({
  noticeType: classification.noticeType,
  safetyScore: riskAnalysis.safetyScore,
  overallRisk: riskAnalysis.overallRisk,
  flaggedIssues: riskAnalysis.admissionsOfFault.length
});
```

## Performance Tips

### 1. Cache Classifications

```javascript
// Classification is deterministic - cache results
const cacheKey = hashText(letterText);
let classification = cache.get(cacheKey);

if (!classification) {
  classification = classifyIRSNotice(letterText);
  cache.set(cacheKey, classification);
}
```

### 2. Parallel Processing

```javascript
// Run independent analyses in parallel
const [classification, deadlineInfo, financialInfo] = await Promise.all([
  classifyIRSNotice(letterText),
  extractDeadlineInfo(letterText),
  extractFinancialInfo(letterText)
]);
```

### 3. Stream AI Responses

```javascript
// For better UX, stream AI responses
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  stream: true,
  messages: [...]
});

for await (const chunk of completion) {
  streamToUser(chunk.choices[0]?.delta?.content);
}
```

## Next Steps

1. **Read Full Documentation**: See `README.md` for complete details
2. **Review Upgrade Guide**: See `INTELLIGENCE-SYSTEM-UPGRADE.md` for architecture
3. **Test with Real Notices**: Use actual IRS letters to validate
4. **Monitor Performance**: Track classification accuracy and risk detection
5. **Gather Feedback**: Collect user feedback on analysis quality

## Support

For questions or issues:
1. Check `README.md` for detailed documentation
2. Review code comments in each module
3. Contact development team

---

**Quick Start Guide Version**: 1.0.0
**Last Updated**: December 16, 2025

