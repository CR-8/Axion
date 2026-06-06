import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const lawyerId = searchParams.get("lawyer_id");

  const supabase = getAdminSupabase();
  let query = supabase
    .from("cases")
    .select(`*, clients(name, phone, preferred_language)`)
    .eq("org_id", ctx.orgId)
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
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    client_id?: string;
    case_number?: string;
    court_name?: string;
    court_city?: string;
    case_type?: string;
    status?: string;
    next_hearing_date?: string;
    assigned_lawyer_id?: string;
    assigned_lawyer_name?: string;
    ecourts_url?: string;
    notes?: string;
  };

  const {
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
  } = body;

  if (!client_id || !case_number) {
    return NextResponse.json(
      { error: "client_id and case_number are required" },
      { status: 400 },
    );
  }

  const supabase = getAdminSupabase();

  // Verify the client belongs to caller's org before creating a case for them
  const { data: client } = await supabase
    .from("clients")
    .select("org_id")
    .eq("id", client_id)
    .single();

  if (!client || client.org_id !== ctx.orgId) {
    return NextResponse.json({ error: "Client not found or forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      org_id: ctx.orgId,
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
      created_by: ctx.userId,
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
    created_by: ctx.userId,
  });

  return NextResponse.json(data, { status: 201 });
}
