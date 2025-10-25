import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { summary } = JSON.parse(event.body);
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.5,
      messages: [
        { role: "system", content: "You are a tax correspondence expert. Write a respectful, professional, IRS-compliant response letter for taxpayers." },
        { role: "user", content: `Write a full response letter based on this summary:\n${summary}\nInclude greeting, subject line referencing the IRS notice, clear explanation, and courteous closing.` }
      ],
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ letter: response.choices[0].message.content }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}