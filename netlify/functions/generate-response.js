import OpenAI from "openai";
import { getSupabaseAdmin } from "./_supabase.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { summary, recordId = null } = JSON.parse(event.body || "{}");
    if (!summary) return { statusCode: 400, body: JSON.stringify({ error: "Missing summary" }) };

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.5,
      messages: [
        { role: "system", content: "You are a tax correspondence expert. Write a respectful, professional, IRS-compliant response letter for taxpayers." },
        { role: "user", content: `Write a full response letter based on this summary:\n${summary}\nInclude greeting, subject referencing the IRS notice, clear explanation, bullet steps if needed, and courteous closing.` }
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