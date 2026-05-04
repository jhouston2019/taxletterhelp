const OpenAI = require("openai");

let _openai;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Generate a complete IRS response letter from wizard data + analysis.
 *
 * @param {Object} payload
 * @param {string} payload.noticeText - Raw IRS notice text from upload/paste
 * @param {Object} payload.analysisJson - Full analysis output from notice extraction
 * @param {Object} payload.strategyJson - Selected response strategy
 * @param {Object} payload.wizardJson - All wizard field values (taxpayer details etc.)
 * @returns {{ letterFull: string, previewText: string }}
 */
async function generateFullJob(payload) {
  const { noticeText, analysisJson, strategyJson, wizardJson } = payload;

  const a = analysisJson || {};
  const s = strategyJson || {};
  const w = wizardJson || {};

  const noticeType = a.notice_type || a.noticeType || "IRS Notice";
  const noticeNumber = a.notice_number || a.cp_number || "";
  const taxYear = a.tax_year || w.taxYear || w.tax_year || "";
  const primaryIssue = a.primary_issue || a.primaryIssue || "";
  const irsAmount = a.irs_amount || a.amount_owed || w.disputeAmount || "";
  const tone = s.tone || "professional and firm";
  const responseApproach = s.approach || s.strategy || "dispute with supporting documentation";
  const taxpayerName = w.taxpayerName || w.full_name || "[TAXPAYER NAME]";
  const taxpayerSSN = w.ssnLast4 ? `XXX-XX-${w.ssnLast4}` : "[SSN]";
  const filingStatus = w.filingStatus || w.filing_status || "";
  const resolutionAsk = w.resolutionAsk || w.resolution_ask || "a full review and correction of my account";
  const taxpayerAddress = w.address || "[TAXPAYER ADDRESS]";
  const dateOfNotice = w.noticeDate || a.notice_date || "[DATE OF NOTICE]";

  const systemPrompt = `You are an expert tax professional and IRS correspondence specialist with 
20+ years of experience helping taxpayers respond to IRS notices. You write clear, professional, 
legally sound response letters that cite relevant IRS procedures, IRC sections, and taxpayer rights.

Your letters:
- Open with a clear re: line referencing the specific notice type and number
- State the taxpayer's position clearly and without ambiguity
- Reference specific IRC sections, Treasury Regulations, or IRS procedures where applicable
- Include a numbered list of factual assertions and supporting points
- Close with a specific, reasonable request for resolution
- Maintain a ${tone} tone throughout
- Are formatted as a formal business letter ready to mail to the IRS

You never fabricate facts. You use only information provided. If information is missing, 
you note what documentation the taxpayer should attach.`;

  const userPrompt = `Generate a complete, professional IRS response letter with these details:

NOTICE INFORMATION:
- Notice Type: ${noticeType}${noticeNumber ? ` (${noticeNumber})` : ""}
- Tax Year in Question: ${taxYear}
- Primary Issue: ${primaryIssue}
- IRS Claimed Amount (if any): ${irsAmount}
- Date of Notice: ${dateOfNotice}

TAXPAYER INFORMATION:
- Name: ${taxpayerName}
- SSN: ${taxpayerSSN}
- Filing Status: ${filingStatus}
- Address: ${taxpayerAddress}

RESPONSE STRATEGY:
- Approach: ${responseApproach}
- Resolution Requested: ${resolutionAsk}

FULL ANALYSIS CONTEXT:
${JSON.stringify(a, null, 2)}

ADDITIONAL WIZARD DETAILS:
${JSON.stringify(w, null, 2)}

ORIGINAL IRS NOTICE TEXT (use for facts only; do not invent amounts or dates not present):
${String(noticeText || "").slice(0, 120000)}

Write the complete letter now. Format it as a proper IRS response letter with date, return address 
block, IRS address block, Re: line, body paragraphs, and signature block. The letter should be 
professional, specific, and persuasive. Reference the exact notice type and any notice number. 
Include what documentation the taxpayer should attach.`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const letterFull = completion.choices[0]?.message?.content?.trim();

  if (!letterFull) {
    throw new Error("OpenAI returned empty letter content");
  }

  const previewText = previewFromLetter(letterFull, analysisJson);

  return { letterFull, previewText };
}

/**
 * Extract a teaser preview (~400 chars) from the full letter.
 * Stops at a sentence boundary near the 400 char mark.
 */
function previewFromLetter(letterFull, analysisJson) {
  if (!letterFull) return "";

  const MAX_CHARS = 400;

  // Try to find a sentence boundary near the limit
  const chunk = letterFull.slice(0, MAX_CHARS + 100);
  const sentenceEnd = chunk.lastIndexOf(". ", MAX_CHARS);

  let preview;
  if (sentenceEnd > 200) {
    preview = letterFull.slice(0, sentenceEnd + 1);
  } else {
    preview = letterFull.slice(0, MAX_CHARS);
    // Don't cut mid-word
    const lastSpace = preview.lastIndexOf(" ");
    if (lastSpace > 300) preview = preview.slice(0, lastSpace);
  }

  return preview.trim() + "...";
}

module.exports = { generateFullJob, previewFromLetter };
