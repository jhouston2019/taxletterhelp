/**
 * Single deterministic AI pipeline: one completion produces strategy + analysis + letter slots.
 * Classification and amounts are deterministic (no AI).
 */
const OpenAI = require("openai");
const {
  classifyIRSNotice,
  extractFinancialInfo,
  extractPrimaryTaxYearFromText,
  extractDeadlineInfo,
} = require("./irs-intelligence/classification-engine.js");

const MODEL = process.env.OPENAI_TAX_JOB_MODEL || "gpt-4o";
const TEMPERATURE = 0;

function formatUsdAmountForLetter(amount) {
  if (amount == null || Number.isNaN(Number(amount))) {
    return "the amount stated in the notice";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));
}

/** Notice.amount is numeric | null (structured). */
function pickNoticeAmount(fi) {
  const n = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
  return n(fi.balanceDue) ?? n(fi.proposedChange) ?? n(fi.largestAmount) ?? null;
}

function deadlineString(deadlineInfo, classification) {
  if (deadlineInfo?.deadlineDate) return String(deadlineInfo.deadlineDate);
  if (deadlineInfo?.daysFromNoticeDate != null) {
    return `Respond within ${deadlineInfo.daysFromNoticeDate} days of the notice date`;
  }
  if (classification?.typicalDeadlineDays != null) {
    return `Typical response window: ${classification.typicalDeadlineDays} days`;
  }
  return null;
}

/**
 * First floor(n*0.25) chars visible; rest hidden (mandatory split).
 */
function quarterSplit(text) {
  const s = String(text ?? "");
  const len = s.length;
  if (!len) return { visible: "", hidden: "" };
  const cut = Math.floor(len * 0.25);
  return { visible: s.slice(0, cut), hidden: s.slice(cut) };
}

function buildLetterFull({
  noticeTypeLabel,
  taxYearLabel,
  amountDisplayString,
  issue_explanation,
  core_argument,
  supporting_docs,
}) {
  return `[USER NAME]
[ADDRESS]

[DATE]

Internal Revenue Service

Re: Notice ${noticeTypeLabel} – Tax Year ${taxYearLabel}

To Whom It May Concern,

I am writing in response to the above-referenced notice concerning a discrepancy in reported income.

The amount in question, totaling ${amountDisplayString}, is not an accurate representation of my taxable income for the period stated. The discrepancy appears to stem from ${issue_explanation}.

Specifically, ${core_argument}.

I am prepared to provide documentation supporting the correct reporting of my income, including ${supporting_docs}.

Based on the above, I respectfully request that the proposed adjustment be reconsidered and corrected.

Sincerely,
[USER NAME]`;
}

function normalizeRiskLevel(v) {
  const x = String(v || "").toUpperCase();
  if (x === "LOW" || x === "MEDIUM" || x === "HIGH") return x;
  return "MEDIUM";
}

function ensureStrategyArray(strategy) {
  if (!Array.isArray(strategy)) return [];
  return strategy.map((s) => String(s || "").trim()).filter(Boolean);
}

function parseJsonFromCompletion(content) {
  const raw = String(content || "").trim();
  if (!raw) throw new Error("Empty model output");
  let jsonStr = raw;
  const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
  if (fence) jsonStr = fence[1].trim();
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON shape");
  return parsed;
}

/**
 * @param {string} inputText Raw IRS notice text
 * @returns {Promise<object>} Unified job object (exact consumer shape)
 */
async function generateFullJob(inputText) {
  const letterText = String(inputText || "").trim();
  if (!letterText) throw new Error("No input text");

  const classification = classifyIRSNotice(letterText);
  const fi = extractFinancialInfo(letterText);
  const taxYear =
    extractPrimaryTaxYearFromText(letterText) ||
    (fi.taxYear != null ? String(fi.taxYear) : null) ||
    "";
  const deadlineInfo = extractDeadlineInfo(letterText);
  const noticeAmount = pickNoticeAmount(fi);

  const notice = {
    type: classification.noticeType || "UNKNOWN",
    tax_year: taxYear || "Unknown",
    amount: noticeAmount,
    issue: "",
    deadline: deadlineString(deadlineInfo, classification),
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const openai = new OpenAI({ apiKey });

  const system = `You are a tax notice analyst and IRS response drafter. You MUST respond with a single JSON object only (no markdown, no prose outside JSON).

Required JSON keys:
- "risk_level": one of LOW, MEDIUM, HIGH
- "risk_summary": one concise paragraph (plain text)
- "strategy": array of 4 to 6 short strings — actionable strategic points that align with the letter arguments you will produce
- "analysis_full": single string, thorough letter analysis and strategy narrative for the taxpayer (plain text or light markdown). Integrate the strategy points naturally.
- "notice_issue_short": short plain-language issue summary (max 200 characters) for UI display
- "issue_explanation": fills template slot — explains the discrepancy source (no placeholders)
- "core_argument": fills template slot — core factual/legal argument (no placeholders)
- "supporting_docs": fills template slot — comma-separated or sentence listing documents (no placeholders)

Hard bans in YOUR generated string values only (issue_explanation, core_argument, supporting_docs, analysis_full, risk_summary, strategy items, notice_issue_short): do not use the phrases "it appears", "you may consider", or "based on the information provided" (case insensitive). Use direct statements.

The IRS letter text is authoritative — do not invent dollar amounts or notice codes not supported by the text.

JSON only.`;

  const userPayload = `IRS NOTICE TEXT:\n"""${letterText.slice(0, 48000)}"""\n\nDETERMINISTIC_CLASSIFICATION:\n${JSON.stringify(
    {
      noticeType: classification.noticeType,
      description: classification.description,
      urgencyLevel: classification.urgencyLevel,
      financialHints: {
        balanceDue: fi.balanceDue,
        proposedChange: fi.proposedChange,
        largestAmount: fi.largestAmount,
      },
      taxYearHint: taxYear,
    },
    null,
    2
  )}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPayload },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  const ai = parseJsonFromCompletion(content);

  const risk = {
    level: normalizeRiskLevel(ai.risk_level),
    summary: String(ai.risk_summary || "").trim() || "Risk assessment completed.",
  };

  const strategy = ensureStrategyArray(ai.strategy);
  const analysis_full = String(ai.analysis_full || "").trim();
  const notice_issue_short = String(ai.notice_issue_short || "").trim().slice(0, 200);
  notice.issue = notice_issue_short || (classification.description ? String(classification.description).slice(0, 200) : "Notice issue summary unavailable.");

  const issue_explanation = String(ai.issue_explanation || "").trim();
  const core_argument = String(ai.core_argument || "").trim();
  const supporting_docs = String(ai.supporting_docs || "").trim();

  if (!issue_explanation || !core_argument || !supporting_docs) {
    throw new Error("Incomplete AI letter slots");
  }
  if (!analysis_full) throw new Error("Incomplete analysis");

  const amountDisplayString = formatUsdAmountForLetter(notice.amount);
  const letter_full = buildLetterFull({
    noticeTypeLabel: notice.type,
    taxYearLabel: notice.tax_year,
    amountDisplayString,
    issue_explanation,
    core_argument,
    supporting_docs,
  });

  const qa = quarterSplit(analysis_full);
  const ql = quarterSplit(letter_full);
  const preview = {
    analysis_visible: qa.visible,
    analysis_hidden: qa.hidden,
    letter_visible: ql.visible,
    letter_hidden: ql.hidden,
  };

  return {
    notice,
    risk,
    strategy,
    analysis_full,
    letter_full,
    preview,
  };
}

module.exports = {
  generateFullJob,
  quarterSplit,
  buildLetterFull,
  formatUsdAmountForLetter,
};
