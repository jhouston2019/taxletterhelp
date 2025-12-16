# IRS Response Intelligence System

## Overview

This system transforms Tax Letter Help from a generic AI tool into an **IRS-specific decision intelligence platform** with embedded procedural logic, risk controls, and notice-specific expertise.

## Why This Tool is Safer Than General AI

### 1. Deterministic Classification
- **General AI**: Hallucinates notice types, makes guesses
- **This System**: Pattern-matching engine with 15+ notice type definitions
- **Result**: Reliable, consistent identification every time

### 2. Procedural Constraints
- **General AI**: Generic responses that may violate IRS procedures
- **This System**: Notice-specific playbooks enforce required elements, prohibited language, and proper structure
- **Result**: IRS-compliant correspondence that follows proper procedures

### 3. Risk Guardrails
- **General AI**: Can generate dangerous admissions or over-disclosure
- **This System**: Analyzes all text for risky language, admissions of fault, and legal misstatements
- **Result**: Protected taxpayer rights, reduced liability exposure

### 4. Evidence Intelligence
- **General AI**: Generic "attach supporting documents" advice
- **This System**: Document-by-document analysis with explicit attach/summarize/exclude guidance
- **Result**: Prevents harmful over-disclosure while ensuring proper documentation

### 5. Deadline Awareness
- **General AI**: Vague "respond soon" guidance
- **This System**: Exact escalation timelines with day-by-day consequences
- **Result**: Users understand urgency and consequences of inaction

## Architecture

### Where Logic Overrides AI

The system uses **deterministic logic** (not AI) for:

1. **Notice Classification** (`classification-engine.js`)
   - Pattern matching against 15+ notice types
   - Deadline extraction and calculation
   - Financial impact assessment

2. **Deadline Calculations** (`deadline-calculator.js`)
   - Mathematical computation of days remaining
   - Predefined escalation sequences by notice type
   - Urgency level determination

3. **Professional Help Thresholds** (`response-playbooks.js`)
   - Objective criteria (amount, notice type, complexity)
   - Mandatory vs. recommended thresholds
   - Clear decision rules

4. **Risk Detection** (`risk-guardrails.js`)
   - Pattern matching for dangerous phrases
   - Admission detection algorithms
   - Over-disclosure identification

### Where AI is Deliberately Constrained

The system **constrains AI generation** through:

1. **System Prompt Engineering** (`index.js`)
   - Notice-specific procedural rules
   - Required elements enforcement
   - Prohibited language lists
   - Tone and structure requirements

2. **Context Injection**
   - Notice classification results
   - Playbook requirements
   - Deadline intelligence
   - Evidence mapping

3. **Output Validation**
   - Risk analysis of AI-generated text
   - Sanitization of dangerous content
   - Professional review triggers

4. **Structured Output Format** (`output-formatter.js`)
   - Fixed section structure
   - No chat-style responses
   - Professional business correspondence

## Module Documentation

### 1. Classification Engine (`classification-engine.js`)

**Purpose**: Deterministic identification of IRS notice types and extraction of critical metadata.

**Key Functions**:
- `classifyIRSNotice(inputText)` - Identifies notice type via pattern matching
- `extractDeadlineInfo(inputText)` - Extracts deadline dates and calculates days remaining
- `extractFinancialInfo(inputText)` - Identifies dollar amounts and financial impact

**Supported Notice Types**:
- CP2000 (Underreported Income)
- CP14, CP501, CP503, CP504 (Balance Due sequence)
- CP75, Audit Letters (Examination notices)
- CP90, CP297, Letter 1058 (Levy notices)
- 5071C, 5747C, 4883C (Identity Verification)
- And more...

### 2. Response Playbooks (`response-playbooks.js`)

**Purpose**: Notice-specific templates and constraints that ensure procedurally correct responses.

**Key Functions**:
- `getPlaybook(noticeType)` - Returns notice-specific requirements
- `validateUserPosition(noticeType, position)` - Validates user's stated position
- `checkProhibitedLanguage(text, noticeType)` - Flags dangerous phrases
- `assessProfessionalHelpNeed(noticeType, amount, complexity)` - Determines if professional help needed

**Playbook Components**:
- Allowed user positions (agree, dispute, partial, etc.)
- Required elements (notice reference, documentation, etc.)
- Prohibited language (admissions, weak phrases)
- Required tone (neutral-factual, cooperative, etc.)
- Evidence types (what documents are appropriate)
- Response structure (opening, body, closing)
- Critical warnings (what NOT to do)
- Professional help thresholds

### 3. Deadline Calculator (`deadline-calculator.js`)

**Purpose**: Calculates exact response windows and predicts escalation sequences.

**Key Functions**:
- `calculateDeadlineIntelligence(classification, deadlineInfo)` - Computes urgency and timing
- `generateEscalationTimeline(classification, deadlineIntel)` - Predicts what happens next
- `generateScenarios(classification, escalationTimeline)` - Creates "what if" scenarios

**Output**:
- Days remaining to respond
- Urgency level (CRITICAL, URGENT, HIGH, MODERATE, NORMAL)
- Recommended action date (with buffer)
- Stage-by-stage escalation sequence
- Consequences at each stage

### 4. Evidence Mapper (`evidence-mapper.js`)

**Purpose**: Maps documents to claims and provides explicit attachment guidance.

**Key Functions**:
- `mapEvidence(documents, classification, playbook)` - Analyzes each document
- `analyzeDocument(doc, noticeType, allowedEvidenceTypes)` - Determines attach/summarize/exclude
- `generateAttachmentInstructions(evidenceMap, noticeType)` - Creates attachment guide
- `validateEvidence(evidenceMap, playbook)` - Checks completeness

**Document Analysis**:
- **ATTACH**: W-2s, 1099s, receipts (when relevant)
- **SUMMARIZE**: Bank statements (never attach full statements)
- **EXCLUDE**: Prior year returns, medical records, full financial statements

**Protection**:
- Prevents over-disclosure of sensitive information
- Warns against volunteering unrequested documents
- Guides redaction of sensitive data

### 5. Risk Guardrails (`risk-guardrails.js`)

**Purpose**: Safety layer that prevents dangerous admissions and legal misstatements.

**Key Functions**:
- `analyzeRisks(text, classification)` - Detects risky language
- `generateSaferAlternative(riskyText, issue)` - Suggests better phrasing
- `assessProfessionalReviewNeed(riskAnalysis, classification, amount)` - Determines review urgency
- `sanitizeText(text, riskAnalysis)` - Removes critical risks
- `generateRiskReport(riskAnalysis, professionalReview)` - Creates safety report

**Risk Categories**:
1. **Admissions of Fault**: "I forgot", "I didn't report", "I knew it was wrong"
2. **Over-Disclosure**: Volunteering information about other years
3. **Legal Misstatements**: Incorrect claims about rights or law
4. **Aggressive Language**: Confrontational or threatening tone
5. **Volunteering Info**: Making promises about future actions

**Safety Scoring**:
- 100 = Perfect (no risks detected)
- 80-99 = Low risk
- 60-79 = Medium risk
- 40-59 = High risk
- <40 = Critical risk (professional review mandatory)

### 6. Output Formatter (`output-formatter.js`)

**Purpose**: Enforces consistent, professional output structure.

**Key Functions**:
- `formatAnalysisOutput(params)` - Creates structured analysis
- `formatResponseLetter(params)` - Formats IRS response letter
- `formatDisclaimer(classification, riskAnalysis)` - Adds appropriate disclaimers

**Output Structure**:
1. What This IRS Notice Means
2. Your Required Action
3. Your Best Response Strategy
4. What Happens Next (Timeline)
5. Risk Assessment (if applicable)
6. When Professional Help Becomes Necessary

**Format Rules**:
- No emojis
- No chat-style language
- Formal business correspondence
- Scannable sections
- Action-oriented guidance

### 7. Main Integration (`index.js`)

**Purpose**: Orchestrates all components into cohesive intelligence system.

**Key Functions**:
- `analyzeIRSLetter(letterText, options)` - Complete letter analysis
- `generateIRSResponse(analysisResult, userPosition, aiGenerateFunction)` - Generates response
- `buildConstrainedSystemPrompt(classification, playbook, deadlineIntelligence)` - Creates AI constraints
- `buildConstrainedUserPrompt(userPosition, evidenceMap, playbook)` - Formats user input

**Analysis Pipeline**:
1. Deterministic classification
2. Playbook retrieval
3. Deadline calculation
4. Evidence mapping (if documents provided)
5. Professional help assessment
6. Risk analysis (if user input provided)
7. Structured output formatting
8. Disclaimer addition

**Response Generation Pipeline**:
1. Validate user position against playbook
2. Check for prohibited language
3. Analyze risks in user input
4. Build constrained AI prompts
5. Generate AI content
6. Analyze AI output for risks
7. Sanitize if necessary
8. Format response letter
9. Add attachment instructions
10. Final professional review assessment

## Usage Examples

### Basic Letter Analysis

```javascript
const { analyzeIRSLetter } = require('./irs-intelligence/index.js');

const result = await analyzeIRSLetter(letterText, {
  documents: [],
  userContext: {}
});

console.log(result.analysisOutput); // Formatted analysis
console.log(result.classification.noticeType); // CP2000, CP14, etc.
console.log(result.deadlineIntelligence.deadline.daysRemaining); // 30
console.log(result.professionalHelpAssessment.recommendProfessional); // true/false
```

### Response Generation with Risk Analysis

```javascript
const { generateIRSResponse } = require('./irs-intelligence/index.js');

const responseResult = await generateIRSResponse(
  analysisResult,
  {
    stance: "partial_dispute",
    explanation: "I agree with items 1 and 2, but dispute item 3 because...",
    requestedAction: "Adjust the proposed assessment to reflect only items 1 and 2"
  },
  aiGenerateFunction
);

if (responseResult.warning) {
  console.log("WARNING:", responseResult.message);
  console.log("Risk Report:", responseResult.riskReport);
} else {
  console.log("Response Letter:", responseResult.responseLetter);
  console.log("Risk Level:", responseResult.riskAnalysis.overallRisk);
  console.log("Needs Review:", responseResult.professionalReviewNeed.needsReview);
}
```

## Integration with Netlify Functions

The intelligence system is integrated into:

1. **`analyze-letter.js`**: Uses `analyzeIRSLetter()` for complete analysis
2. **`generate-response.js`**: Uses `generateIRSResponse()` for constrained response generation

Both functions maintain backward compatibility with existing UI while adding enhanced intelligence.

## Testing

To test the intelligence system:

```javascript
// Test classification
const { classifyIRSNotice } = require('./classification-engine.js');
const classification = classifyIRSNotice("CP2000 Notice - Proposed Changes to Your Tax Return");
console.log(classification); // Should return CP2000 classification

// Test risk analysis
const { analyzeRisks } = require('./risk-guardrails.js');
const risks = analyzeRisks("I forgot to report that income", classification);
console.log(risks.admissionsOfFault); // Should flag "I forgot"

// Test playbook
const { getPlaybook } = require('./response-playbooks.js');
const playbook = getPlaybook("CP2000");
console.log(playbook.allowedUserPositions); // ["agree", "partial_dispute", "full_dispute"]
```

## Future Enhancements

1. **Machine Learning Layer**: Train on successful IRS outcomes to refine recommendations
2. **Multi-Year Analysis**: Detect patterns across multiple tax years
3. **Audit Probability Scoring**: Predict likelihood of audit based on notice type and responses
4. **State Tax Integration**: Extend to state tax notices
5. **Real-Time IRS Data**: Integrate with IRS API for current processing times and backlog info

## Maintenance

### Adding New Notice Types

1. Add pattern to `classification-engine.js` classifications array
2. Create playbook entry in `response-playbooks.js` IRS_PLAYBOOKS object
3. Add escalation sequence in `deadline-calculator.js` escalationSequences object
4. Add strategy in `output-formatter.js` strategies object
5. Test with sample notice text

### Updating Risk Patterns

1. Add new patterns to `risk-guardrails.js` pattern arrays
2. Assign risk level (LOW, MEDIUM, HIGH, CRITICAL)
3. Create safer alternatives in `generateSaferAlternative()` function
4. Test with sample risky text

## License

Proprietary - All rights reserved.

## Support

For questions or issues with the intelligence system, contact the development team.

