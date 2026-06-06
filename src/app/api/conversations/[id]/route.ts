import { NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId, isAuthorized } from "@/lib/auth-guard";

export async function PATCH(
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

  const body = await request.json() as { mode?: string };

  if (body.mode && !["agent", "human"].includes(body.mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("conversations")
    .update({ mode: body.mode })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
