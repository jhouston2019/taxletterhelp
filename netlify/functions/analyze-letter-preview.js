/**
 * Preview-only analysis (flow UX): deterministic classification + deadline math.
 * Does NOT require billing, does NOT call full analyzeIRSLetter (no OpenAI).
 * Full analysis remains in analyze-letter.js — unchanged.
 */
const { wrapHandler, trackError } = require('./_error-tracking.js');
const {
  classifyIRSNotice,
  extractDeadlineInfo,
  extractFinancialInfo,
  extractPrimaryTaxYearFromText,
} = require('./irs-intelligence/classification-engine.js');
const { generateDeadlineIntelligence } = require('./irs-intelligence/deadline-calculator.js');

const mainHandler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const parsed = JSON.parse(event.body || '{}');
    const { text: rawText = '' } = parsed;
    const letterText = String(rawText).trim();

    if (letterText.length < 20) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Please provide more notice text (at least 20 characters).' }),
      };
    }

    const classification = classifyIRSNotice(letterText);
    const fi = extractFinancialInfo(letterText);
    const deadlineInfo = extractDeadlineInfo(letterText);
    const extractedTaxYear = extractPrimaryTaxYearFromText(letterText);
    const taxYear = fi.taxYear || extractedTaxYear || null;
    const deadlineIntelligence = generateDeadlineIntelligence(classification, deadlineInfo);

    const teaserSummary =
      `${classification.description || 'This notice was classified'} ` +
      `(${(classification.noticeType || 'UNKNOWN').toString()}). ` +
      `A full procedural breakdown, response strategy, and letter generation unlock after purchase. ` +
      `Key amounts and response timing below are from your notice and classification only.`;

    const structuredAnalysis = {
      letterType: classification.noticeType,
      reason: classification.description,
      requiredActions: classification.responseRequired
        ? 'A written response is typically required. Full deadlines and methods unlock with your analysis.'
        : 'Review the notice. Full response guidance is included with purchase.',
      nextSteps: 'Unlock the full analysis to see your notice-specific action checklist and evidence list.',
      confidence: classification.confidence === 'high' ? 90 : classification.confidence === 'medium' ? 75 : 60,
      urgency: (classification.urgencyLevel || 'medium').toString(),
      financialInfo: fi,
      taxYear: taxYear || null,
      // Same shape the wizard uses; no OpenAI narrative (full path remains analyze-letter only).
      deadlineIntelligence: deadlineIntelligence,
      fullAnalysis: null,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        message: 'Preview ready.',
        analysis: structuredAnalysis,
        taxYear: structuredAnalysis.taxYear,
        summary: teaserSummary,
        isPreview: true,
      }),
    };
  } catch (err) {
    trackError(err, { functionName: 'analyze-letter-preview' });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Preview failed', details: (err && err.message) || String(err) }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, 'analyze-letter-preview');
