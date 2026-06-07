import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId } from "@/lib/auth-guard";

// GET /api/notifications — fetch notifications for current user's org
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserOrgId(request);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const supabase = getAdminSupabase();

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase notifications query error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    // Also fetch unread count
    const { count, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("is_read", false);

    if (countError) {
      console.error("Supabase notifications count error:", countError);
      return NextResponse.json({ error: countError.message, details: countError }, { status: 500 });
    }

    return NextResponse.json({ notifications: data || [], unreadCount: count || 0 });
  } catch (err: unknown) {
    const e = err as Error;
    console.error("Unhandled notifications fetch error:", e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}

// PATCH /api/notifications — mark notification(s) as read
export async function PATCH(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    ids?: string[];
    mark_all_read?: boolean;
  };

  const supabase = getAdminSupabase();

  if (body.mark_all_read) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("org_id", ctx.orgId)
      .eq("is_read", false);

    return NextResponse.json({ success: true });
  }

  if (body.ids && body.ids.length > 0) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", body.ids)
      .eq("org_id", ctx.orgId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide ids or mark_all_read" }, { status: 400 });
}
