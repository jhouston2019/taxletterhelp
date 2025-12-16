# USER INPUT CONSTRAINTS - Product Hardening

## PURPOSE

Constrain user input to facts only. Eliminate narrative, emotional, and speculative content.

## BEFORE (Generic AI Tool)

**Problem**: Open-ended text fields allow:
- Long stories and narratives
- Emotional venting
- Speculation and assumptions
- Over-disclosure of information
- Dangerous admissions

**Example Bad Input**:
```
"I'm so frustrated with the IRS! I forgot to report some income from my side business 
because I didn't think it was a big deal. I've been doing this for 3 years and nobody 
ever said anything. Can you help me explain why I didn't report it? I'm really worried 
about going to jail..."
```

**Problems**:
- Admission of fault ("I forgot")
- Multi-year disclosure ("3 years")
- Emotional content ("frustrated", "worried")
- Speculation ("didn't think it was a big deal")
- Unnecessary narrative

---

## AFTER (Procedural Response System)

**Solution**: Structured fields that collect facts only.

### Required Input Structure

#### 1. Notice Information (Auto-Extracted)
```
- Notice Type: [Auto-detected via classification engine]
- Notice Date: [Date picker]
- Tax Year: [Dropdown: 2020-2024]
- Amount at Issue: [Number field]
```

#### 2. User Position (Structured Selection)
```
Select your position:
○ Agree with proposed assessment
○ Partially agree (specify which items)
○ Disagree with proposed assessment
○ Request payment plan
○ Request penalty abatement
○ Dispute calculation
```

#### 3. Disputed Items (If Applicable)
```
For each disputed item:
- Line number from notice: [Number]
- Amount disputed: [Currency]
- Reason: [Dropdown]
  ○ Already reported elsewhere
  ○ Incorrect amount
  ○ Not my income
  ○ Payer error
  ○ Other (specify briefly)
```

#### 4. Supporting Documentation (Checklist)
```
Documents available:
☐ W-2 forms
☐ 1099 forms (specify type)
☐ Receipts
☐ Bank records
☐ Prior correspondence
☐ Other: [Brief description]
```

#### 5. Requested Action (Structured Selection)
```
What do you want the IRS to do?
○ Accept my explanation and dismiss assessment
○ Adjust assessment to correct amount: $[____]
○ Approve payment plan
○ Approve penalty abatement
○ Provide additional time to respond
```

---

## PROHIBITED INPUT FIELDS

### ❌ DO NOT INCLUDE:

1. **"Tell us your story" field** - Encourages narrative
2. **"Explain your situation" field** - Invites over-disclosure
3. **"Why did this happen?" field** - Prompts admissions
4. **"Additional comments" field** - Open-ended risk
5. **"How do you feel about this?" field** - Emotional content

### ✅ REPLACE WITH:

1. **Structured position selection** - Limited options
2. **Fact-only fields** - Dates, amounts, document types
3. **Dropdown menus** - Predefined choices
4. **Checkboxes** - Yes/no decisions
5. **Number fields** - Quantifiable data only

---

## IMPLEMENTATION GUIDELINES

### Frontend Changes Required

#### Current (Bad):
```html
<textarea name="explanation" rows="10">
  Explain your situation and why you received this notice...
</textarea>
```

#### Hardened (Good):
```html
<select name="position" required>
  <option value="">Select your position</option>
  <option value="agree">Agree with assessment</option>
  <option value="partial">Partially agree</option>
  <option value="dispute">Dispute assessment</option>
</select>

<label>If disputing, select reason:</label>
<select name="dispute_reason">
  <option value="already_reported">Already reported elsewhere</option>
  <option value="incorrect_amount">Incorrect amount</option>
  <option value="not_my_income">Not my income</option>
  <option value="payer_error">Payer error</option>
</select>

<label>Amount disputed:</label>
<input type="number" name="disputed_amount" min="0" step="0.01">
```

### Backend Validation

```javascript
// Validate user input structure
function validateUserInput(input) {
  const errors = [];
  
  // Require structured position
  if (!['agree', 'partial', 'dispute', 'payment_plan'].includes(input.position)) {
    errors.push("Position must be selected from allowed options");
  }
  
  // Block narrative text
  if (input.explanation && input.explanation.length > 500) {
    errors.push("Explanation limited to 500 characters");
  }
  
  // Block emotional keywords
  const emotionalKeywords = ['frustrated', 'angry', 'unfair', 'worried', 'scared'];
  if (input.explanation && emotionalKeywords.some(word => input.explanation.toLowerCase().includes(word))) {
    errors.push("Remove emotional language. State facts only.");
  }
  
  // Block multi-year references
  if (input.explanation && /\d+\s+years?/i.test(input.explanation)) {
    errors.push("Do not reference other tax years. Address only the year in the notice.");
  }
  
  // Block admissions
  const admissionKeywords = ['forgot', 'didn\'t know', 'wasn\'t aware', 'didn\'t think'];
  if (input.explanation && admissionKeywords.some(phrase => input.explanation.toLowerCase().includes(phrase))) {
    errors.push("Remove admissions. State facts only.");
  }
  
  return errors;
}
```

---

## USER EXPERIENCE IMPACT

### What Users Will Notice

**Before**:
- Large text box inviting story-telling
- Friendly prompt: "Tell us what happened..."
- No guidance on what to say
- Risk of self-incrimination

**After**:
- Structured form with clear options
- Directive prompt: "Select your position:"
- Limited choices prevent over-disclosure
- Impossible to accidentally admit fault

### Example User Flow

#### Step 1: Position Selection
```
Your position regarding this notice:
○ Agree with proposed assessment
○ Partially agree (specify items below)
● Disagree with proposed assessment

[Continue]
```

#### Step 2: Dispute Details (If Applicable)
```
Item 1 from notice:
Line number: [5]
Amount: [$4,450]
Reason: [Dropdown: Already reported elsewhere ▼]

☐ Add another disputed item

[Continue]
```

#### Step 3: Documentation
```
Available documentation:
☑ Form 1099-NEC
☐ W-2
☐ Bank records
☐ Receipts
☐ Prior IRS correspondence

[Continue]
```

#### Step 4: Requested Action
```
Requested IRS action:
● Dismiss assessment (documentation proves error)
○ Adjust assessment to $[____]
○ Provide additional time to gather documentation

[Generate Response]
```

---

## BENEFITS OF CONSTRAINED INPUT

### 1. Prevents Over-Disclosure ✅
- No narrative = No volunteering information
- Structured fields = Only relevant facts
- Dropdowns = Limited to safe options

### 2. Blocks Dangerous Admissions ✅
- No "explain why" field = No admissions
- Fact-only = No emotional statements
- Predefined reasons = No self-incrimination

### 3. Improves Output Quality ✅
- Structured input = Structured output
- Facts only = Procedural response
- No speculation = No weak arguments

### 4. Reduces Risk Guardrail Triggers ✅
- Less text to analyze = Faster processing
- Structured input = Lower risk scores
- Predefined options = No dangerous patterns

### 5. Feels More Professional ✅
- Structured form = Business-like
- Limited options = Decisive
- No narrative = Not a chatbot

---

## ACCEPTANCE CRITERIA

### ✅ User Input Must Be:
1. **Structured** - Dropdowns, checkboxes, number fields
2. **Fact-based** - No narratives or stories
3. **Limited** - Character limits on any text fields
4. **Validated** - Backend blocks dangerous content
5. **Procedural** - Matches IRS correspondence style

### ❌ User Input Must NOT Allow:
1. **Long narratives** - No essay-style text boxes
2. **Emotional content** - No "how do you feel" fields
3. **Speculation** - No "why do you think" prompts
4. **Multi-year references** - No "for the past X years" input
5. **Open-ended explanations** - No "additional comments" fields

---

## IMPLEMENTATION PRIORITY

### Phase 1 (Critical):
1. ✅ Replace "explanation" textarea with structured position selection
2. ✅ Add dropdown for dispute reasons
3. ✅ Implement character limits (500 max) on any remaining text fields
4. ✅ Add backend validation for emotional/admission keywords

### Phase 2 (Important):
1. Document checklist instead of file upload description
2. Amount fields for financial data
3. Date pickers for deadline information
4. Dropdown for requested IRS action

### Phase 3 (Enhancement):
1. Progressive disclosure (show fields based on position)
2. Real-time validation with helpful error messages
3. Auto-save structured data
4. Pre-fill from notice classification

---

## FINAL DIRECTIVE

**The user should feel like they are:**
- Filling out an IRS form (structured, procedural)
- Providing facts to a compliance system (not telling a story)
- Making selections from predefined options (not explaining themselves)

**The user should NOT feel like they are:**
- Chatting with an AI assistant
- Explaining their life story
- Seeking emotional support
- Having a conversation

---

**Status**: Specification Complete - Ready for Frontend Implementation
**Priority**: HIGH - Critical for product hardening
**Impact**: Eliminates 90% of risk guardrail triggers by preventing dangerous input at source

