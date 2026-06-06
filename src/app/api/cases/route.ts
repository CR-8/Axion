import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const lawyerId = searchParams.get("lawyer_id");

  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  let query = supabase
    .from("cases")
    .select(`*, clients(name, phone, preferred_language)`)
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (lawyerId) query = query.eq("assigned_lawyer_id", lawyerId);
  if (search) {
    query = query.or(`case_number.ilike.%${search}%,court_name.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    org_id,
    client_id,
    case_number,
    court_name,
    court_city,
    case_type,
    status,
    next_hearing_date,
    assigned_lawyer_id,
    assigned_lawyer_name,
    ecourts_url,
    notes,
    created_by,
  } = body;

  if (!org_id || !client_id || !case_number) {
    return NextResponse.json(
      { error: "org_id, client_id, case_number are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      org_id,
      client_id,
      case_number: case_number.trim(),
      court_name: court_name || null,
      court_city: court_city || null,
      case_type: case_type || "other",
      status: status || "active",
      next_hearing_date: next_hearing_date || null,
      assigned_lawyer_id: assigned_lawyer_id || null,
      assigned_lawyer_name: assigned_lawyer_name || null,
      ecourts_url: ecourts_url || null,
      notes: notes || null,
      created_by: created_by || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create initial case event
  await supabase.from("case_events").insert({
    case_id: data.id,
    event_type: "status_change",
    old_value: null,
    new_value: status || "active",
    note: "Case created",
    created_by: created_by || null,
  });

  return NextResponse.json(data, { status: 201 });
}
