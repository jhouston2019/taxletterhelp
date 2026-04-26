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

// Simple in-memory rate limiter — resets on function cold start
const ipRequestLog = {};
const RATE_LIMIT = 3; // max requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour window

function isRateLimited(ip) {
  const now = Date.now();
  if (!ipRequestLog[ip]) {
    ipRequestLog[ip] = { count: 1, windowStart: now };
    return false;
  }
  const entry = ipRequestLog[ip];
  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

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

  const ip =
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['X-Forwarded-For']?.split(',')[0]?.trim() ||
    event.headers['client-ip'] ||
    event.headers['x-nf-client-connection-ip'] ||
    'unknown';

  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        error:
          'Too many preview requests. Please try again later or proceed to generate your full response.',
      }),
    };
  }

  try {
    const parsed = JSON.parse(event.body || '{}');
    const { text: rawText = '' } = parsed;
    const letterText = String(rawText).trim();

    if (!letterText || typeof letterText !== 'string' || letterText.length < 50) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Please provide the text of your IRS notice.' }),
      };
    }

    // Cap input length to prevent prompt stuffing (no OpenAI in this function — see analyze-letter.js)
    const truncatedText = letterText.slice(0, 8000);

    const classification = classifyIRSNotice(truncatedText);
    const fi = extractFinancialInfo(truncatedText);
    const deadlineInfo = extractDeadlineInfo(truncatedText);
    const extractedTaxYear = extractPrimaryTaxYearFromText(truncatedText);
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
      deadlineIntelligence: deadlineIntelligence,
      fullAnalysis: null,
    };

    const remaining = Math.max(0, RATE_LIMIT - (ipRequestLog[ip]?.count ?? 0));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'X-Preview-Remaining': String(remaining),
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
