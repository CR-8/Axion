import { NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId, isAuthorized } from "@/lib/auth-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  // Verify the conversation belongs to the caller's org
  const { data: convo } = await supabase
    .from("conversations")
    .select("org_id")
    .eq("id", id)
    .single();

  if (!convo) return Response.json({ error: "Not found" }, { status: 404 });
  if (!isAuthorized(ctx, convo.org_id as string)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(messages);
}
