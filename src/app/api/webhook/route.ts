import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { handleBotMessage } from "@/lib/bot-flow";
import type { Conversation } from "@/lib/types";

// ── GET — Meta webhook verification ──────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Use global env verify token (Meta sends one verification per app)
  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "lexbot_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Meta webhook verified");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ── POST — Meta Cloud API JSON format only ────────────────────
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Unsupported content type. Expected application/json." },
      { status: 415 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Acknowledge immediately; process async
  void processMeta(payload);
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

// ── Meta Cloud API message processor ─────────────────────────
async function processMeta(payload: Record<string, unknown>) {
  try {
    const entry = (payload?.entry as Record<string, unknown>[])?.[0];
    const change = (entry?.changes as Record<string, unknown>[])?.[0];
    const value = change?.value as Record<string, unknown> | undefined;
    if (!value) return;

    // Skip delivery/read status updates
    if (value.statuses) return;

    const messages = value.messages as Record<string, unknown>[] | undefined;
    if (!messages || messages.length === 0) return;

    const message = messages[0] as Record<string, unknown>;
    const from = message.from as string;
    const whatsappMsgId = message.id as string;
    const messageType = message.type as string;

    // Identify the org by phone_number_id from webhook metadata
    const metadata = value.metadata as Record<string, unknown> | undefined;
    const phoneNumberId = metadata?.phone_number_id as string | undefined;

    let messageText = "";
    let hasMedia = false;

    if (messageType === "text") {
      const textObj = message.text as Record<string, unknown> | undefined;
      messageText = (textObj?.body as string) || "";
    } else if (["image", "document", "audio", "video"].includes(messageType)) {
      hasMedia = true;
      const mediaObj = message[messageType] as Record<string, unknown> | undefined;
      messageText = (mediaObj?.caption as string) || `[${messageType} received]`;
    }

    if (!from) return;

    await processMessage({ from, messageText, whatsappMsgId, hasMedia, phoneNumberId });
  } catch (err) {
    console.error("Meta webhook error:", err);
  }
}

// ── Core message processor ────────────────────────────────────
async function processMessage({
  from,
  messageText,
  whatsappMsgId,
  hasMedia,
  phoneNumberId,
}: {
  from: string;
  messageText: string;
  whatsappMsgId: string;
  hasMedia: boolean;
  phoneNumberId?: string;
}) {
  if (!from || !messageText) return;

  const supabase = getAdminSupabase();

  // Normalize phone: ensure it has +
  const phone = from.startsWith("+") ? from : `+${from}`;

  try {
    // Resolve org from phone_number_id if available
    let orgId: string | null = null;
    if (phoneNumberId) {
      const { data: orgSettings } = await supabase
        .from("org_settings")
        .select("org_id")
        .eq("whatsapp_phone_id", phoneNumberId)
        .single();
      orgId = orgSettings?.org_id ?? null;
    }

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
          org_id: orgId,
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
