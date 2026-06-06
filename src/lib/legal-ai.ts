import OpenAI from "openai";
import { buildSystemPrompt, DEFAULT_LEGAL_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { supabase } from "@/lib/supabase";
import type { Case, Client, OrgSettings } from "@/lib/types";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/types";

interface LegalAIContext {
  orgId: string;
  client: Client;
  activeCase: Case;
  conversationId: string;
}

export async function getLegalAIResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context: LegalAIContext,
): Promise<string> {
  // Fetch org settings (API key, model, system prompt template)
  const { data: settings } = await supabase
    .from("org_settings")
    .select("*")
    .eq("org_id", context.orgId)
    .single<OrgSettings>();

  // Fetch org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", context.orgId)
    .single();

  const apiKey =
    settings?.ai_api_key || process.env.OPENROUTER_API_KEY || "";
  const model = settings?.ai_model || process.env.AI_MODEL || "openai/gpt-4o-mini";
  const promptTemplate =
    settings?.system_prompt || DEFAULT_LEGAL_SYSTEM_PROMPT;
  const botName = settings?.bot_name || "LexAssist";
  const orgName = org?.name || "Legal Services";

  const { activeCase, client } = context;

  const systemPrompt = buildSystemPrompt(promptTemplate, {
    bot_name: botName,
    org_name: orgName,
    client_name: client.name,
    client_phone: client.phone,
    case_number: activeCase.case_number,
    case_status: CASE_STATUS_LABELS[activeCase.status] || activeCase.status,
    court_name: activeCase.court_name || "Not specified",
    court_city: activeCase.court_city || "",
    next_hearing: activeCase.next_hearing_date
      ? new Date(activeCase.next_hearing_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Not scheduled",
    assigned_lawyer: activeCase.assigned_lawyer_name || "Not assigned",
    case_type: CASE_TYPE_LABELS[activeCase.case_type] || activeCase.case_type,
  });

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-20), // Last 20 messages for context
      ],
    });

    return (
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response right now. Please contact your lawyer directly."
    );
  } catch (err) {
    console.error("AI error:", err);
    return "I'm having trouble connecting right now. Please try again in a moment or contact your lawyer directly.";
  }
}

// ── Fallback: generic AI without case context (for unverified conversations) ──
export async function getGenericAIResponse(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful legal assistant. Help users understand how to access their case information. Ask them to share their Case ID to get started.",
        },
        ...messages.slice(-10),
      ],
    });
    return (
      completion.choices[0]?.message?.content ||
      "Please share your Case ID to get started."
    );
  } catch {
    return "Please share your Case ID to get started.";
  }
}
