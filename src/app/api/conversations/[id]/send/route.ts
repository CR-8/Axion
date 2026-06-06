import { NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getUserOrgId, isAuthorized } from "@/lib/auth-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  // Get conversation and verify org ownership
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("phone, org_id")
    .eq("id", id)
    .single();

  if (convoError || !conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (!isAuthorized(ctx, conversation.org_id as string)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { message?: string };
  const { message } = body;

  if (!message?.trim()) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  // Send via Meta Cloud API (using org's credentials)
  await sendWhatsAppMessage(conversation.phone as string, message, ctx.orgId);

  // Store in DB
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      role: "assistant",
      content: message,
    })
    .select()
    .single();

  if (msgError) {
    return Response.json({ error: msgError.message }, { status: 500 });
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return Response.json(msg);
}
