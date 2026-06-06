// Legacy ai.ts — kept for backward compatibility
// New code should use legal-ai.ts instead
import OpenAI from "openai";
import { DEFAULT_LEGAL_SYSTEM_PROMPT } from "@/lib/system-prompt";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function getAIResponse(
  messages: { role: "user" | "assistant"; content: string }[],
) {
  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: DEFAULT_LEGAL_SYSTEM_PROMPT,
      },
      ...messages,
    ],
  });

  return (
    completion.choices[0]?.message?.content ||
    "Sorry, I couldn't generate a response."
  );
}
