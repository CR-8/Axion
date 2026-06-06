import { NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminSupabase();

  // Filter by the authenticated user's org only
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Fetch last message for each conversation
  const withLastMessage = await Promise.all(
    (conversations || []).map(async (convo: Record<string, unknown>) => {
      const { data: messages } = await supabase
        .from("messages")
        .select("content, role, created_at")
        .eq("conversation_id", convo.id as string)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        ...convo,
        last_message: messages?.[0]?.content || null,
      };
    }),
  );

  return Response.json(withLastMessage);
}
