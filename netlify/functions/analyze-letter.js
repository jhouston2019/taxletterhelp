import OpenAI from "openai";
import { sanitizeText, rateLimitCheck } from './validate-input.js';
import { addSecurityHeaders, validateOrigin } from './security-headers.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    // Validate origin
    validateOrigin(event);
    
    const { text, userId } = JSON.parse(event.body);
    
    // Rate limiting
    if (userId) {
      rateLimitCheck(userId, 'letter_analysis', 5, 60000); // 5 requests per minute
    }
    
    // Sanitize input
    const sanitizedText = sanitizeText(text);
    
    if (!sanitizedText || sanitizedText.length < 10) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Invalid or empty text provided' 
        })
      };
    }
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a tax letter explainer. Analyze IRS letters and provide clear, helpful explanations of what they mean and what actions the recipient should take. Be professional and accurate." 
        },
        { 
          role: "user", 
          content: `Explain this IRS letter in simple terms: ${sanitizedText}` 
        }
      ],
      max_tokens: 1000
    });

    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ 
        explanation: completion.choices[0].message.content 
      })
    };
    
    return addSecurityHeaders(response);
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to analyze letter',
        details: error.message 
      })
    };
  }
}
