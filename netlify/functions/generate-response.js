import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { letterText, userData } = JSON.parse(event.body);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an IRS response letter generator. Create professional, well-structured response letters that address the specific issues mentioned in the original IRS letter. Use proper business letter format and maintain a respectful, professional tone." 
        },
        { 
          role: "user", 
          content: `Draft a professional response to this IRS letter:\n\n${letterText}\n\nUser data: ${JSON.stringify(userData)}` 
        }
      ],
      max_tokens: 1500
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
        responseLetter: completion.choices[0].message.content 
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
        error: 'Failed to generate response',
        details: error.message 
      })
    };
  }
}
