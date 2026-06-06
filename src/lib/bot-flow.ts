// Bot conversation state machine
// Handles the identification flow: new → awaiting_case_id → awaiting_name → verified

import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getLegalAIResponse } from "@/lib/legal-ai";
import { detectIntent } from "@/lib/intent";
import type { Conversation, Case, Client } from "@/lib/types";
import { CASE_STATUS_LABELS, DOC_TYPE_LABELS } from "@/lib/types";

const SESSION_HOURS = 24;

interface BotContext {
  conversation: Conversation;
  messageText: string;
  hasMedia: boolean;
  mediaUrl?: string;
  mediaType?: string;
  whatsappMsgId: string;
  phone: string;
}

export async function handleBotMessage(ctx: BotContext): Promise<void> {
  const { conversation, messageText } = ctx;

  // Store the incoming user message
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: messageText,
    whatsapp_msg_id: ctx.whatsappMsgId || null,
  });

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  // Route by session state
  const state = conversation.session_state;

  if (state === "new" || state === "awaiting_case_id") {
    await handleAwaitingCaseId(ctx);
  } else if (state === "awaiting_name") {
    await handleAwaitingName(ctx);
  } else if (state === "verified") {
    await handleVerified(ctx);
  }
}

// ── State: new / awaiting_case_id ─────────────────────────────
async function handleAwaitingCaseId(ctx: BotContext) {
  const text = ctx.messageText.trim();

  // If the message looks like a case number (contains alphanumeric, at least 3 chars)
  if (text.length >= 2) {
    // Try to find a case with this case_number
    const { data: cases } = await supabase
      .from("cases")
      .select("*, clients(name, phone, preferred_language)")
      .ilike("case_number", text)
      .limit(1);

    if (cases && cases.length > 0) {
      const foundCase = cases[0];
      // Store case_id temporarily and ask for name
      await supabase
        .from("conversations")
        .update({
          session_state: "awaiting_name",
          case_id: foundCase.id,
          org_id: foundCase.org_id,
        })
        .eq("id", ctx.conversation.id);

      const reply = `Thank you! I found your case.\n\nTo verify your identity, please confirm your full name as registered with us.`;
      await sendAndStore(ctx.conversation.id, ctx.phone, reply);
      return;
    }
  }

  // No case found — ask for case ID
  await supabase
    .from("conversations")
    .update({ session_state: "awaiting_case_id" })
    .eq("id", ctx.conversation.id);

  const welcome = ctx.conversation.session_state === "new"
    ? `Welcome to LexAssist! 👋\n\nI'm your legal case assistant. To get started, please share your *Case ID* (e.g., LF-2024-0042).\n\nYou can find your Case ID in the onboarding message sent by your lawyer.`
    : `I couldn't find a case with that ID. Please double-check and try again, or contact your lawyer for your Case ID.`;

  await sendAndStore(ctx.conversation.id, ctx.phone, welcome);
}

// ── State: awaiting_name ──────────────────────────────────────
async function handleAwaitingName(ctx: BotContext) {
  const nameInput = ctx.messageText.trim().toLowerCase();

  // Fetch the case we stored
  const { data: conv } = await supabase
    .from("conversations")
    .select("case_id")
    .eq("id", ctx.conversation.id)
    .single();

  if (!conv?.case_id) {
    await supabase
      .from("conversations")
      .update({ session_state: "awaiting_case_id" })
      .eq("id", ctx.conversation.id);
    await sendAndStore(
      ctx.conversation.id,
      ctx.phone,
      "Something went wrong. Please share your Case ID again.",
    );
    return;
  }

  const { data: caseData } = await supabase
    .from("cases")
    .select("*, clients(*)")
    .eq("id", conv.case_id)
    .single();

  if (!caseData || !caseData.clients) {
    await sendAndStore(
      ctx.conversation.id,
      ctx.phone,
      "We couldn't find your case. Please contact your lawyer.",
    );
    return;
  }

  const client = caseData.clients as Client;
  const registeredName = client.name.toLowerCase();

  // Fuzzy name match — check if input is contained in registered name or vice versa
  const isMatch =
    registeredName.includes(nameInput) ||
    nameInput.includes(registeredName) ||
    nameInput.split(" ").some((w) => w.length > 2 && registeredName.includes(w));

  if (!isMatch) {
    await sendAndStore(
      ctx.conversation.id,
      ctx.phone,
      `The name you provided doesn't match our records.\n\nIf you believe this is an error, please contact your lawyer directly.`,
    );
    return;
  }

  // ✅ Verified! Link the conversation to client + case
  const sessionExpiry = new Date();
  sessionExpiry.setHours(sessionExpiry.getHours() + SESSION_HOURS);

  await supabase
    .from("conversations")
    .update({
      session_state: "verified",
      client_id: client.id,
      case_id: caseData.id,
      org_id: caseData.org_id,
      preferred_language: client.preferred_language,
      session_expires_at: sessionExpiry.toISOString(),
    })
    .eq("id", ctx.conversation.id);

  const statusLabel = CASE_STATUS_LABELS[caseData.status as keyof typeof CASE_STATUS_LABELS] || caseData.status;
  const hearingDate = caseData.next_hearing_date
    ? new Date(caseData.next_hearing_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not scheduled";

  const greeting = `✅ Identity verified! Welcome, ${client.name}.\n\n*Case:* ${caseData.case_number}\n*Status:* ${statusLabel}\n*Next Hearing:* ${hearingDate}\n*Lawyer:* ${caseData.assigned_lawyer_name || "Not assigned"}\n\nYou can ask me about your case status, documents, hearing dates, or your lawyer's contact. How can I help you?`;

  await sendAndStore(ctx.conversation.id, ctx.phone, greeting);
}

// ── State: verified ───────────────────────────────────────────
async function handleVerified(ctx: BotContext) {
  // Check if session has expired
  if (
    ctx.conversation.session_expires_at &&
    new Date(ctx.conversation.session_expires_at) < new Date()
  ) {
    await supabase
      .from("conversations")
      .update({
        session_state: "new",
        client_id: null,
        case_id: null,
      })
      .eq("id", ctx.conversation.id);

    await sendAndStore(
      ctx.conversation.id,
      ctx.phone,
      "Your session has expired. Please share your Case ID again to continue.",
    );
    return;
  }

  if (!ctx.conversation.client_id || !ctx.conversation.case_id) {
    await sendAndStore(
      ctx.conversation.id,
      ctx.phone,
      "Something went wrong. Please share your Case ID again.",
    );
    return;
  }

  const intent = detectIntent(ctx.messageText, ctx.hasMedia);

  // Fetch client + case data
  const [clientRes, caseRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", ctx.conversation.client_id).single(),
    supabase.from("cases").select("*").eq("id", ctx.conversation.case_id).single(),
  ]);

  const client = clientRes.data as Client | null;
  const activeCase = caseRes.data as Case | null;

  if (!client || !activeCase) {
    await sendAndStore(
      ctx.conversation.id,
      ctx.phone,
      "I couldn't retrieve your case information. Please contact your lawyer.",
    );
    return;
  }

  let reply: string;

  switch (intent) {
    case "case_status": {
      const statusLabel = CASE_STATUS_LABELS[activeCase.status] || activeCase.status;
      const hearing = activeCase.next_hearing_date
        ? new Date(activeCase.next_hearing_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Not scheduled";
      reply = `📋 *Case Status Update*\n\n*Case:* ${activeCase.case_number}\n*Court:* ${activeCase.court_name || "N/A"}, ${activeCase.court_city || ""}\n*Status:* ${statusLabel}\n*Next Hearing:* ${hearing}\n*Lawyer:* ${activeCase.assigned_lawyer_name || "Not assigned"}`;
      break;
    }

    case "hearing_date": {
      const hearing = activeCase.next_hearing_date
        ? new Date(activeCase.next_hearing_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Not scheduled yet";
      reply = `📅 *Next Hearing*\n\n*Case:* ${activeCase.case_number}\n*Court:* ${activeCase.court_name || "N/A"}\n*Date:* ${hearing}\n\nPlease be present or inform your lawyer if you cannot attend.`;
      break;
    }

    case "lawyer_contact": {
      reply = activeCase.assigned_lawyer_name
        ? `👨‍⚖️ *Your Lawyer*\n\n*Name:* ${activeCase.assigned_lawyer_name}\n\nFor their contact number, please reach out to the firm directly.`
        : "No lawyer has been assigned to your case yet. Please contact the firm.";
      break;
    }

    case "documents": {
      const { data: docs } = await supabase
        .from("documents")
        .select("name, doc_type, created_at, source")
        .eq("case_id", activeCase.id)
        .order("created_at", { ascending: false });

      if (!docs || docs.length === 0) {
        reply = "📁 No documents have been uploaded for your case yet.";
      } else {
        const list = docs
          .slice(0, 10)
          .map(
            (d, i) =>
              `${i + 1}. ${d.name} (${DOC_TYPE_LABELS[d.doc_type as keyof typeof DOC_TYPE_LABELS] || d.doc_type}) — ${new Date(d.created_at).toLocaleDateString("en-IN")}`,
          )
          .join("\n");
        reply = `📁 *Documents for Case ${activeCase.case_number}*\n\n${list}\n\nTo download any document, please log in or contact your lawyer.`;
      }
      break;
    }

    case "upload": {
      reply =
        "📎 Thank you for sharing the document. Your lawyer will be notified. Note: To link it to your case, please inform your lawyer to upload it from the CRM dashboard.";
      break;
    }

    case "fallback_ai":
    default: {
      // Get conversation history
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", ctx.conversation.id)
        .order("created_at", { ascending: true })
        .limit(20);

      reply = await getLegalAIResponse(
        (history || []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          orgId: ctx.conversation.org_id!,
          client,
          activeCase,
          conversationId: ctx.conversation.id,
        },
      );
      break;
    }
  }

  await sendAndStore(ctx.conversation.id, ctx.phone, reply);
}

// ── Helper: send message via WhatsApp and store in DB ────────
async function sendAndStore(
  conversationId: string,
  phone: string,
  content: string,
) {
  await sendWhatsAppMessage(phone, content);
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content,
  });
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
