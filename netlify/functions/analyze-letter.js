import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { text } = JSON.parse(event.body);
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a tax letter explainer. Analyze IRS letters and provide clear, helpful explanations of what they mean and what actions the recipient should take. Be professional and accurate." 
        },
        { 
          role: "user", 
          content: `Explain this IRS letter in simple terms: ${text}` 
        }
      ],
      max_tokens: 1000
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
        explanation: completion.choices[0].message.content 
      })
    };
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
