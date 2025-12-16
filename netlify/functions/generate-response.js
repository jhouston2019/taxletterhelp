const OpenAI = require("openai");
const { getSupabaseAdmin } = require("./_supabase.js");
const { generateIRSResponse, analyzeIRSLetter, buildConstrainedSystemPrompt, buildConstrainedUserPrompt } = require("./irs-intelligence/index.js");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
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
    const { 
      summary, 
      letterText = null,
      recordId = null, 
      tone = 'professional', 
      approach = 'cooperative', 
      style = 'detailed',
      userPosition = null,
      documents = []
    } = JSON.parse(event.body || "{}");
    
    if (!summary && !letterText) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing summary or letter text" }) };
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // If we have the original letter text, use the full intelligence system
    if (letterText && userPosition) {
      console.log('Using IRS Response Intelligence System');
      
      // Step 1: Analyze the letter
      const analysisResult = await analyzeIRSLetter(letterText, {
        documents: documents,
        userContext: {
          userInput: userPosition.explanation,
          complexity: userPosition.complexity || "standard"
        }
      });
      
      // Step 2: Generate constrained AI response
      const aiGenerateFunction = async (systemPrompt, userPrompt) => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7, // Lower temperature for more consistent, factual output
          top_p: 0.9,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        });
        return completion.choices?.[0]?.message?.content?.trim() || "";
      };
      
      // Step 3: Generate response with full intelligence system
      const responseResult = await generateIRSResponse(
        analysisResult,
        userPosition,
        aiGenerateFunction
      );
      
      // Check for errors or warnings
      if (responseResult.error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: responseResult.message,
            allowedPositions: responseResult.allowedPositions
          })
        };
      }
      
      if (responseResult.warning) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            warning: true,
            message: responseResult.message,
            riskReport: responseResult.riskReport,
            recommendation: responseResult.recommendation
          })
        };
      }
      
      const letter = responseResult.responseLetter;
      
      // Update the existing record (if provided)
      if (recordId) {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
          .from("tlh_letters")
          .update({ 
            ai_response: letter, 
            status: "responded",
            risk_level: responseResult.metadata.riskLevel,
            requires_professional_review: responseResult.professionalReviewNeed.needsReview
          })
          .eq("id", recordId);
        if (error) console.error("Database update error:", error);
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          letter,
          riskAnalysis: responseResult.riskAnalysis,
          professionalReviewNeed: responseResult.professionalReviewNeed,
          attachmentInstructions: responseResult.attachmentInstructions,
          metadata: responseResult.metadata
        }),
      };
    }
    
    // Fallback: Use legacy system with enhanced prompting (if no letter text provided)
    console.log('Using legacy response generation with enhanced prompting');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      top_p: 0.9,
      messages: [
        { 
          role: "system", 
          content: `You are a senior IRS correspondence specialist with 20+ years of experience.

CRITICAL REQUIREMENTS:
1. Use formal business letter format
2. Reference specific IRS notice number and date
3. State position clearly and factually
4. Avoid admissions of fault or negligence
5. Do NOT volunteer information beyond the notice scope
6. Do NOT use phrases like "I forgot", "I didn't know", "I wasn't aware"
7. Focus on facts, not emotions
8. Be specific about requested actions
9. Include proper closing and signature line

TONE: ${tone} - Professional and appropriate for IRS correspondence
APPROACH: ${approach} - Balanced and strategic
STYLE: ${style} - Clear and well-organized

Write a response that protects the taxpayer's rights while maintaining professional standards.` 
        },
        { 
          role: "user", 
          content: `Based on this IRS letter analysis, write a professional response letter:\n\n${summary}\n\nEnsure the response addresses all issues raised, provides clear explanations, and follows proper IRS correspondence protocols.` 
        }
      ],
    });

    const letter = completion.choices?.[0]?.message?.content?.trim() || "";

    // Update the existing record (if provided)
    if (recordId) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("tlh_letters")
        .update({ ai_response: letter, status: "responded" })
        .eq("id", recordId);
      if (error) console.error("Database update error:", error);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ letter }),
    };
  } catch (error) {
    console.error("Error in generate-response:", error);
    return { 
      statusCode: 500, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message }) 
    };
  }
}