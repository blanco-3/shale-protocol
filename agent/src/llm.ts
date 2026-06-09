import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const LLM_MODEL = "llama-3.3-70b-versatile";

/**
 * Send a chat completion request to Groq.
 * Returns the raw text response.
 */
export async function chat(systemPrompt: string, userMessage: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage  },
    ],
    temperature: 0.2,   // low temp for consistent financial decisions
    max_tokens:  512,
  });
  return completion.choices[0].message.content ?? "";
}

/**
 * Parse JSON from LLM output — strips markdown code fences if present.
 */
export function parseJSON<T>(text: string): T | null {
  try {
    const clean = text.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}
