// Import dependencies with error handling
// Netlify uses Node 18+ (see netlify.toml NODE_VERSION) — native global fetch, no node-fetch require.
// PDF: no pdf-parse (DOMMatrix / browser APIs break in Node); use `text` from request body for PDFs.
let OpenAI, mammoth, Tesseract, getSupabaseAdmin;

try {
  OpenAI = require("openai");
  mammoth = require("mammoth");
  Tesseract = require("tesseract.js");
  const supabaseModule = require("./_supabase.js");
  getSupabaseAdmin = supabaseModule.getSupabaseAdmin;
} catch (importError) {
  console.error("Import error:", importError);
}

const { wrapHandler, trackError } = require('./_error-tracking.js');

const mainHandler = async (event) => {
  console.log('=== ANALYZE LETTER FUNCTION START ===');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Event body type:', typeof event.body);
  console.log('Event body length:', event.body ? event.body.length : 0);
  
  // Check if dependencies loaded successfully
  if (!OpenAI) {
    console.error('OpenAI not loaded');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'OpenAI dependency not loaded' })
    };
  }
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    console.log('Parsing event body...');
    const parsedBody = JSON.parse(event.body || "{}");
    console.log('Parsed body keys:', Object.keys(parsedBody));
    
    const { text, fileUrl, imageUrl, userEmail = null, priceId = process.env.STRIPE_PRICE_RESPONSE, stripeSessionId = null } = parsedBody;
    let letterText = text || "";
    
    console.log('Letter text length:', letterText.length);
    console.log('File URL provided:', !!fileUrl);
    console.log('Image URL provided:', !!imageUrl);

    // --- STEP 1: Extract text from file if provided ---
    if (fileUrl) {
      try {
        console.log('Processing file URL:', fileUrl);
        
        if (fileUrl.startsWith('data:')) {
          const base64Data = fileUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          if (fileUrl.includes('application/pdf')) {
            console.log('PDF data URL: skipping server-side PDF parse (no pdf-parse in Node); using text from request body only.');
          } else if (fileUrl.includes('application/vnd.openxmlformats') || fileUrl.includes('application/msword')) {
            if (!mammoth) {
              console.log('mammoth not available, skipping DOC/DOCX processing');
              letterText += "\n\n[Word document uploaded but processing not available - please paste text manually]";
            } else {
              const { value } = await mammoth.extractRawText({ buffer: buffer });
              letterText += "\n\n" + value;
              console.log('DOCX text extracted, length:', value.length);
            }
          }
        } else {
          const fileResponse = await globalThis.fetch(fileUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
          }
          const fileBuffer = await fileResponse.arrayBuffer();
          const uint8 = new Uint8Array(fileBuffer);

          if (fileUrl.endsWith(".pdf")) {
            console.log('PDF URL: skipping server-side PDF parse (no pdf-parse in Node); using text from request body only.');
          } else if (fileUrl.endsWith(".doc") || fileUrl.endsWith(".docx")) {
            if (!mammoth) {
              letterText += "\n\n[Word document uploaded but processing not available - please paste text manually]";
            } else {
              const { value } = await mammoth.extractRawText({ buffer: Buffer.from(uint8) });
              letterText += "\n\n" + value;
            }
          }
        }
      } catch (fileError) {
        console.error("File processing error:", fileError);
        letterText += "\n\n[File processing error - using text from request body if any]";
      }
    }

    // --- STEP 2: Extract text from image if provided ---
    if (imageUrl) {
      try {
        console.log('Processing image URL:', imageUrl.substring(0, 50) + '...');
        
        if (!Tesseract) {
          console.log('Image processing dependencies not available, skipping image processing');
          letterText += "\n\n[Image uploaded but OCR processing not available - please paste text manually]";
        } else {
          if (imageUrl.startsWith('data:')) {
            const { data: { text: extractedText } } = await Tesseract.recognize(imageUrl, "eng");
            letterText += "\n\n" + extractedText;
            console.log('Image text extracted, length:', extractedText.length);
          } else {
            const { data: { text: extractedText } } = await Tesseract.recognize(imageUrl, "eng");
            letterText += "\n\n" + extractedText;
          }
        }
      } catch (imageError) {
        console.error("Image processing error:", imageError);
        letterText += "\n\n[Image processing error - please paste text manually]";
      }
    }

    if (!letterText.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No text provided or extracted from files." }),
      };
    }

    // --- STEP 3: Use IRS Response Intelligence System ---
    console.log('Starting IRS Intelligence System analysis...');
    
    const { analyzeIRSLetter } = require('./irs-intelligence/index.js');
    const { extractPrimaryTaxYearFromText } = require('./irs-intelligence/classification-engine.js');

    let structuredAnalysis;
    try {
      console.log('[analyze-letter] letterText preview:', letterText?.substring(0, 500));

      const intelligenceResult = await analyzeIRSLetter(letterText, {
        documents: [],
        userContext: {}
      });
      
      console.log('Intelligence analysis completed');
      console.log('Notice Type:', intelligenceResult?.classification?.noticeType);
      console.log('Urgency:', intelligenceResult?.classification?.urgencyLevel);
      console.log('Risk Level:', intelligenceResult?.metadata?.riskLevel);
      
      const fi = intelligenceResult?.financialInfo || {};
      const cls = intelligenceResult?.classification || {};
      const extractedTaxYear = extractPrimaryTaxYearFromText(letterText);
      const taxYear =
        cls.taxYear ||
        fi.taxYear ||
        extractedTaxYear ||
        null;

      structuredAnalysis = {
        letterType: cls.noticeType,
        taxYear,
        summary: intelligenceResult?.analysisOutput,
        reason: intelligenceResult?.classification?.description,
        requiredActions: `Response Required: ${intelligenceResult?.classification?.responseRequired ? 'YES' : 'NO'}. Days Remaining: ${intelligenceResult?.deadlineIntelligence?.deadline?.daysRemaining}`,
        nextSteps: intelligenceResult?.deadlineIntelligence?.escalation?.currentStage?.action,
        confidence: intelligenceResult?.classification?.confidence === "high" ? 90 : intelligenceResult?.classification?.confidence === "medium" ? 75 : 60,
        urgency: intelligenceResult?.classification?.urgencyLevel,
        estimatedResolution: "30-90 days with proper response",
        penaltyRisk: intelligenceResult?.classification?.escalationRisk?.join?.('; ') ?? '',
        paymentOptions: "Payment plans available - see analysis for details",
        appealRights: "Appeal rights preserved with timely response",
        deadlineIntelligence: intelligenceResult?.deadlineIntelligence,
        financialInfo: intelligenceResult?.financialInfo,
        professionalHelpRecommendation: intelligenceResult?.professionalHelpAssessment,
        playbook: intelligenceResult?.playbook?.noticeType,
        fullAnalysis: intelligenceResult?.analysisOutput
      };
      
      console.log('Structured analysis prepared');
      
    } catch (intelligenceError) {
      console.error('Intelligence system error, falling back to basic analysis:', intelligenceError);
      
      const { classifyIRSNotice, extractFinancialInfo } = require('./irs-intelligence/classification-engine.js');
      const classification = classifyIRSNotice(letterText);
      const fiQuick = extractFinancialInfo(letterText);
      const extractedTaxYearCatch = extractPrimaryTaxYearFromText(letterText);

      structuredAnalysis = {
        letterType: classification?.noticeType,
        taxYear: fiQuick.taxYear || extractedTaxYearCatch || null,
        summary: `This appears to be a ${classification?.noticeType} (${classification?.description}). ${classification?.escalationRisk?.[0] ?? ''}`,
        reason: classification?.description,
        requiredActions: `Response required within ${classification?.typicalDeadlineDays} days`,
        nextSteps: "Review the notice carefully and gather supporting documentation",
        confidence: classification?.confidence === "high" ? 85 : 70,
        urgency: classification?.urgencyLevel,
        estimatedResolution: "30-90 days",
        penaltyRisk: classification?.escalationRisk?.join?.('; ') ?? '',
        paymentOptions: "Contact IRS for payment arrangements",
        appealRights: "You have appeal rights - see notice for details"
      };
    }

    const summary =
      structuredAnalysis?.summary ||
      structuredAnalysis?.explanation ||
      "Analysis complete. See details below.";

    // --- STEP 4: Store in Supabase (optional) ---
    let recordId = null;
    if (getSupabaseAdmin) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("tlh_letters")
          .insert({
            user_email: userEmail,
            stripe_session_id: stripeSessionId,
            price_id: priceId,
            letter_text: letterText,
            analysis: structuredAnalysis ?? {},
            summary,
            status: "analyzed"
          })
          .select("id, created_at, status")
          .single();

        if (error) throw error;
        recordId = data.id;
        console.log('Record saved to database:', recordId);
      } catch (dbError) {
        console.error("Database error:", dbError);
        console.log('Continuing without database storage');
      }
    } else {
      console.log('Database not available, skipping storage');
    }

    // --- STEP 5: Return structured response ---
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: "Analysis complete.",
        analysis: structuredAnalysis ?? {},
        taxYear: structuredAnalysis?.taxYear ?? null,
        recordId: recordId,
        summary
      }),
    };
  } catch (err) {
    console.error('[analyze-letter] handler error:', err && err.message, err && err.stack);
    trackError(err, {
      functionName: 'analyze-letter',
    });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        summary: 'Analysis temporarily unavailable - server error',
        explanation: 'The analyze function encountered an error. Check Netlify logs.',
      }),
    };
  }
};

exports.handler = wrapHandler(mainHandler, 'analyze-letter');
