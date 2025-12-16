// Import dependencies with error handling
let OpenAI, fetch, pdfParse, mammoth, Tesseract, getSupabaseAdmin;

try {
  OpenAI = require("openai");
  fetch = require("node-fetch");
  pdfParse = require("pdf-parse");
  mammoth = require("mammoth");
  Tesseract = require("tesseract.js");
  const supabaseModule = require("./_supabase.js");
  getSupabaseAdmin = supabaseModule.getSupabaseAdmin;
} catch (importError) {
  console.error("Import error:", importError);
}

exports.handler = async (event) => {
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
        
        if (!pdfParse || !mammoth) {
          console.log('File processing dependencies not available, skipping file processing');
          console.log('pdfParse available:', !!pdfParse);
          console.log('mammoth available:', !!mammoth);
          letterText += "\n\n[File uploaded but processing not available - please paste text manually]";
        } else {
          console.log('File processing dependencies available');
          // Check if it's a data URL (base64 encoded file)
          if (fileUrl.startsWith('data:')) {
            const base64Data = fileUrl.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            
            if (fileUrl.includes('application/pdf')) {
              console.log('Processing PDF file, buffer size:', buffer.length);
              const parsed = await pdfParse(buffer);
              console.log('PDF parsed successfully, text length:', parsed.text.length);
              letterText += "\n\n" + parsed.text;
              console.log('PDF text extracted, length:', parsed.text.length);
            } else if (fileUrl.includes('application/vnd.openxmlformats') || fileUrl.includes('application/msword')) {
              const { value } = await mammoth.extractRawText({ buffer: buffer });
              letterText += "\n\n" + value;
              console.log('DOCX text extracted, length:', value.length);
            }
          } else {
            // Handle regular URL
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) {
              throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
            }
            const fileBuffer = await fileResponse.arrayBuffer();
            const uint8 = new Uint8Array(fileBuffer);

            if (fileUrl.endsWith(".pdf")) {
              const parsed = await pdfParse(uint8);
              letterText += "\n\n" + parsed.text;
            } else if (fileUrl.endsWith(".doc") || fileUrl.endsWith(".docx")) {
              const { value } = await mammoth.extractRawText({ buffer: Buffer.from(uint8) });
              letterText += "\n\n" + value;
            }
          }
        }
      } catch (fileError) {
        console.error("File processing error:", fileError);
        letterText += "\n\n[File processing error - please paste text manually]";
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
          // Check if it's a data URL (base64 encoded image)
          if (imageUrl.startsWith('data:')) {
            const { data: { text: extractedText } } = await Tesseract.recognize(imageUrl, "eng");
            letterText += "\n\n" + extractedText;
            console.log('Image text extracted, length:', extractedText.length);
          } else {
            // Handle regular URL
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
    
    // Import the intelligence system
    const { analyzeIRSLetter } = require('./irs-intelligence/index.js');
    
    try {
      // Run complete intelligence analysis
      const intelligenceResult = await analyzeIRSLetter(letterText, {
        documents: [], // No documents in initial analysis
        userContext: {}
      });
      
      console.log('Intelligence analysis completed');
      console.log('Notice Type:', intelligenceResult.classification.noticeType);
      console.log('Urgency:', intelligenceResult.classification.urgencyLevel);
      console.log('Risk Level:', intelligenceResult.metadata.riskLevel);
      
      // Format for backward compatibility with existing UI
      const structuredAnalysis = {
        letterType: intelligenceResult.classification.noticeType,
        summary: intelligenceResult.analysisOutput,
        reason: intelligenceResult.classification.description,
        requiredActions: `Response Required: ${intelligenceResult.classification.responseRequired ? 'YES' : 'NO'}. Days Remaining: ${intelligenceResult.deadlineIntelligence.deadline.daysRemaining}`,
        nextSteps: intelligenceResult.deadlineIntelligence.escalation.currentStage.action,
        confidence: intelligenceResult.classification.confidence === "high" ? 90 : intelligenceResult.classification.confidence === "medium" ? 75 : 60,
        urgency: intelligenceResult.classification.urgencyLevel,
        estimatedResolution: "30-90 days with proper response",
        penaltyRisk: intelligenceResult.classification.escalationRisk.join('; '),
        paymentOptions: "Payment plans available - see analysis for details",
        appealRights: "Appeal rights preserved with timely response",
        
        // Enhanced fields from intelligence system
        deadlineIntelligence: intelligenceResult.deadlineIntelligence,
        financialInfo: intelligenceResult.financialInfo,
        professionalHelpRecommendation: intelligenceResult.professionalHelpAssessment,
        playbook: intelligenceResult.playbook.noticeType,
        fullAnalysis: intelligenceResult.analysisOutput
      };
      
      console.log('Structured analysis prepared');
      
    } catch (intelligenceError) {
      console.error('Intelligence system error, falling back to basic analysis:', intelligenceError);
      
      // Fallback to basic classification if intelligence system fails
      const { classifyIRSNotice } = require('./irs-intelligence/classification-engine.js');
      const classification = classifyIRSNotice(letterText);
      
      var structuredAnalysis = {
        letterType: classification.noticeType,
        summary: `This appears to be a ${classification.noticeType} (${classification.description}). ${classification.escalationRisk[0]}`,
        reason: classification.description,
        requiredActions: `Response required within ${classification.typicalDeadlineDays} days`,
        nextSteps: "Review the notice carefully and gather supporting documentation",
        confidence: classification.confidence === "high" ? 85 : 70,
        urgency: classification.urgencyLevel,
        estimatedResolution: "30-90 days",
        penaltyRisk: classification.escalationRisk.join('; '),
        paymentOptions: "Contact IRS for payment arrangements",
        appealRights: "You have appeal rights - see notice for details"
      };
    }

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
            analysis: structuredAnalysis,
            summary: structuredAnalysis.summary || aiResponse,
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
        analysis: structuredAnalysis,
        recordId: recordId,
        summary: structuredAnalysis.summary || aiResponse
      }),
    };
  } catch (err) {
    console.error("Error in analyze-letter.js:", err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }),
    };
  }
};