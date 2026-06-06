import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { updated_by_name, ...rest } = body;

  // Fetch current case to log changes
  const { data: current } = await supabase
    .from("cases")
    .select("status, next_hearing_date, assigned_lawyer_id, assigned_lawyer_name")
    .eq("id", id)
    .single();

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
  }> = [];

  if (rest.status && current?.status !== rest.status) {
    events.push({
      case_id: id,
      event_type: "status_change",
      old_value: current?.status || null,
      new_value: rest.status,
      created_by_name: updated_by_name || null,
    });
  }
  if (rest.next_hearing_date && current?.next_hearing_date !== rest.next_hearing_date) {
    events.push({
      case_id: id,
      event_type: "hearing_updated",
      old_value: current?.next_hearing_date || null,
      new_value: rest.next_hearing_date,
      created_by_name: updated_by_name || null,
    });
  }
  if (rest.assigned_lawyer_name && current?.assigned_lawyer_name !== rest.assigned_lawyer_name) {
    events.push({
      case_id: id,
      event_type: "lawyer_changed",
      old_value: current?.assigned_lawyer_name || null,
      new_value: rest.assigned_lawyer_name,
      created_by_name: updated_by_name || null,
    });
  }

  if (events.length > 0) {
    await supabase.from("case_events").insert(events);
  }

  return NextResponse.json(data);
}
