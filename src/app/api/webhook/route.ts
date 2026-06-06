import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { handleBotMessage } from "@/lib/bot-flow";
import type { Conversation } from "@/lib/types";

// ── GET — Meta webhook verification ─────────────────────────
// Also works as a health check for Twilio-style "webhook active" check
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "lexbot_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Meta webhook verified");
    return new Response(challenge, { status: 200 });
  }

  // If no Meta params, just return health check (Twilio health check)
  return new Response("Webhook active ✓", { status: 200 });
}

// ── POST — Handles both Twilio (form) and Meta (JSON) formats ──
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  let from: string = "";
  let messageText: string = "";
  let whatsappMsgId: string = "";
  let hasMedia = false;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    // ── Twilio WhatsApp format ──
    const formData = await request.formData();
    from = (formData.get("From") as string) ?? "";
    messageText = (formData.get("Body") as string) ?? "";
    whatsappMsgId = (formData.get("MessageSid") as string) ?? "";

    // Check for media
    const numMedia = parseInt((formData.get("NumMedia") as string) || "0");
    if (numMedia > 0) {
      hasMedia = true;
      const mediaCaption = formData.get("Body") as string;
      messageText = mediaCaption || "[media received]";
    }

    // Normalize: Twilio sends "whatsapp:+XXXXXXXXXX" → extract just the phone
    from = from.replace(/^whatsapp:/, "");

    // Return TwiML ack immediately (Twilio needs 200 + TwiML or empty)
    // We process async then respond
    void processMessage({ from, messageText, whatsappMsgId, hasMedia });
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  } else if (contentType.includes("application/json")) {
    // ── Meta Cloud API JSON format ──
    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    void processMeta(payload);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } else {
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 415 },
    );
  }
}

// ── Twilio message processor ──────────────────────────────────
async function processMessage({
  from,
  messageText,
  whatsappMsgId,
  hasMedia,
}: {
  from: string;
  messageText: string;
  whatsappMsgId: string;
  hasMedia: boolean;
}) {
  if (!from || !messageText) return;

  // Normalize phone: ensure it has +
  const phone = from.startsWith("+") ? from : `+${from}`;

  try {
    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("phone", phone)
      .single<Conversation>();

    if (!conversation) {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({
          phone,
          name: null,
          session_state: "new",
          mode: "agent",
        })
        .select()
        .single<Conversation>();
      conversation = newConvo;
    }

    if (!conversation) {
      console.error("Failed to find or create conversation for", phone);
      return;
    }

    // Deduplicate by whatsapp_msg_id
    if (whatsappMsgId) {
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("whatsapp_msg_id", whatsappMsgId)
        .single();
      if (existing) return;
    }

    // If human mode, store message but don't auto-reply
    if (conversation.mode === "human") {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        role: "user",
        content: messageText,
        whatsapp_msg_id: whatsappMsgId || null,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);
      return;
    }

    // Run bot flow
    await handleBotMessage({
      conversation,
      messageText,
      hasMedia,
      whatsappMsgId,
      phone,
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
}

// ── Meta Cloud API message processor ─────────────────────────
async function processMeta(payload: any) {
  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    if (!value) return;
    if (value.statuses) return;

    const messages = value.messages;
    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const from: string = message.from;
    const whatsappMsgId: string = message.id;
    const messageType: string = message.type;

    let messageText = "";
    let hasMedia = false;

    if (messageType === "text") {
      messageText = message.text?.body || "";
    } else if (["image", "document", "audio", "video"].includes(messageType)) {
      hasMedia = true;
      messageText = message[messageType]?.caption || `[${messageType} received]`;
    }

    if (!from) return;
    await processMessage({ from, messageText, whatsappMsgId, hasMedia });
  } catch (err) {
    console.error("Meta webhook error:", err);
  }
}
