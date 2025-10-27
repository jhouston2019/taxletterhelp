import OpenAI from "openai";
import { getSupabaseAdmin } from "./_supabase.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { fileContent, userEmail = null, priceId = process.env.STRIPE_PRICE_RESPONSE, stripeSessionId = null } = JSON.parse(event.body || "{}");
    if (!fileContent) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fileContent" }) };
    }

    // 1) Analyze with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.4,
      messages: [
        { role: "system", content: "You are a certified tax correspondence expert specializing in IRS letters. Summarize and classify each notice clearly and concisely." },
        { role: "user", content: `Analyze this IRS letter and provide:\n1) Letter type (CP/Audit/etc.)\n2) Reason\n3) Next steps required\n\nLetter:\n${fileContent}` }
      ],
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";
    const analysis = {
      model: "gpt-4-turbo",
      temperature: 0.4,
      result: summary
    };

    // 2) Store in Supabase
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tlh_letters")
      .insert({
        user_email: userEmail,
        stripe_session_id: stripeSessionId,
        price_id: priceId,
        letter_text: fileContent,
        analysis,
        summary,
        status: "analyzed"
      })
      .select("id, created_at, status")
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ summary, recordId: data.id }),
    };
  } catch (error) {
    // best-effort error row insert
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("tlh_letters").insert({ status: "error", analysis: { error: String(error) } });
    } catch {}
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}