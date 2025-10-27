const OpenAI = require("openai");
const { getSupabaseAdmin } = require("./_supabase.js");

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

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { summary, recordId = null } = JSON.parse(event.body || "{}");
    if (!summary) return { statusCode: 400, body: JSON.stringify({ error: "Missing summary" }) };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      top_p: 0.9,
      messages: [
        { 
          role: "system", 
          content: `You are a senior tax attorney with 20+ years of experience specializing in IRS correspondence and tax controversy matters. 

Write a professional, IRS-compliant response letter that varies in approach and tone while maintaining professionalism:

1. **Format & Structure:**
   - Use proper business letter format with date, recipient, and subject line
   - Reference the specific IRS notice number, date, and taxpayer ID
   - Vary your tone between formal and conversational while remaining respectful
   - Include proper salutation and closing

2. **Content Requirements:**
   - Address each specific issue raised by the IRS
   - Provide clear, factual explanations with supporting details
   - Include relevant tax law references when appropriate
   - Request specific actions or clarifications as needed
   - Offer to provide additional documentation if required
   - Vary your approach: sometimes be more assertive, sometimes more conciliatory

3. **Professional Standards:**
   - Use precise IRS terminology and form references
   - Include appropriate legal disclaimers
   - Follow current IRS response guidelines
   - Maintain professional courtesy while adapting your assertiveness level
   - Ensure all statements are accurate and verifiable

4. **Response Elements:**
   - Acknowledge receipt of the notice
   - State your position clearly and concisely
   - Provide supporting documentation references
   - Request specific relief or clarification
   - Include contact information for follow-up
   - Set reasonable expectations for response time

Write a comprehensive response that protects the taxpayer's rights while maintaining professional standards. Vary your writing style and approach to make each response unique while being equally effective.` 
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
      if (error) throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ letter }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}