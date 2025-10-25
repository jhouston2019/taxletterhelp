import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { fileContent } = JSON.parse(event.body);
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.4,
      messages: [
        { role: "system", content: "You are a certified tax correspondence expert specializing in IRS letters. Summarize and classify each notice clearly and concisely." },
        { role: "user", content: `Analyze this IRS letter and provide:\n1. Type of letter (CP, audit, etc.)\n2. Reason for issue\n3. Next steps required\n\nLetter:\n${fileContent}` }
      ],
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ summary: response.choices[0].message.content }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}