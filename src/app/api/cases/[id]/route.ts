import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId, isAuthorized } from "@/lib/auth-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from("cases")
    .select(`
      *,
      clients(id, name, phone, preferred_language),
      case_events(*),
      documents(id, name, doc_type, created_at, source, uploaded_by_name)
    `)
    .eq("id", id)
    .order("created_at", { referencedTable: "case_events", ascending: true })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAuthorized(ctx, data.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  // Verify ownership
  const { data: existing } = await supabase
    .from("cases")
    .select("org_id, status, next_hearing_date, assigned_lawyer_id, assigned_lawyer_name")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAuthorized(ctx, existing.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const { updated_by_name, ...rest } = body as { updated_by_name?: string } & Record<string, unknown>;

  const allowed = [
    "status",
    "next_hearing_date",
    "assigned_lawyer_id",
    "assigned_lawyer_name",
    "court_name",
    "court_city",
    "ecourts_url",
    "notes",
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in rest) updates[key] = rest[key];
  }

  const { data, error } = await supabase
    .from("cases")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log events for key changes
  const events: Array<{
    case_id: string;
    event_type: string;
    old_value: string | null;
    new_value: string | null;
    created_by_name: string | null;
    created_by: string | null;
  }> = [];

  if (rest.status && existing.status !== rest.status) {
    events.push({
      case_id: id,
      event_type: "status_change",
      old_value: existing.status || null,
      new_value: rest.status as string,
      created_by_name: updated_by_name || null,
      created_by: ctx.userId,
    });
  }
  if (rest.next_hearing_date && existing.next_hearing_date !== rest.next_hearing_date) {
    events.push({
      case_id: id,
      event_type: "hearing_updated",
      old_value: existing.next_hearing_date || null,
      new_value: rest.next_hearing_date as string,
      created_by_name: updated_by_name || null,
      created_by: ctx.userId,
    });
  }
  if (rest.assigned_lawyer_name && existing.assigned_lawyer_name !== rest.assigned_lawyer_name) {
    events.push({
      case_id: id,
      event_type: "lawyer_changed",
      old_value: existing.assigned_lawyer_name || null,
      new_value: rest.assigned_lawyer_name as string,
      created_by_name: updated_by_name || null,
      created_by: ctx.userId,
    });
  }
  if (body.note_text) {
    events.push({
      case_id: id,
      event_type: "note_added",
      old_value: null,
      new_value: body.note_text as string,
      created_by_name: updated_by_name || null,
      created_by: ctx.userId,
    });
  }

  if (events.length > 0) {
    await supabase.from("case_events").insert(events);
  }

  return NextResponse.json(data);
}
