import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId, isAuthorized } from "@/lib/auth-guard";
import type { CaseMonitoring } from "@/lib/types";

// GET /api/cases/[id]/monitoring — fetch monitoring config + recent updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  // Verify case ownership
  const { data: caseData } = await supabase
    .from("cases")
    .select("org_id")
    .eq("id", id)
    .single();

  if (!caseData || !isAuthorized(ctx, caseData.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch monitoring record
  const { data: monitoring } = await supabase
    .from("case_monitoring")
    .select("*")
    .eq("case_id", id)
    .maybeSingle<CaseMonitoring>();

  // Fetch recent updates if monitoring exists
  let updates: unknown[] = [];
  if (monitoring) {
    const { data } = await supabase
      .from("case_updates")
      .select("*")
      .eq("monitoring_id", monitoring.id)
      .order("update_date", { ascending: false })
      .limit(20);
    updates = data || [];
  }

  return NextResponse.json({ monitoring, updates });
}

// POST /api/cases/[id]/monitoring — enable monitoring
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  // Verify case ownership
  const { data: caseData } = await supabase
    .from("cases")
    .select("org_id, case_number, court_name")
    .eq("id", id)
    .single();

  if (!caseData || !isAuthorized(ctx, caseData.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    external_case_number?: string;
    court_name?: string;
  };

  const externalCaseNumber = body.external_case_number?.trim() || (caseData.case_number as string);
  const courtName = body.court_name?.trim() || (caseData.court_name as string) || null;

  // Check if monitoring already exists
  const { data: existing } = await supabase
    .from("case_monitoring")
    .select("id")
    .eq("case_id", id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Monitoring already enabled for this case." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("case_monitoring")
    .insert({
      case_id: id,
      org_id: ctx.orgId,
      external_case_number: externalCaseNumber,
      court_name: courtName,
      monitoring_status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/cases/[id]/monitoring — update monitoring (pause/resume/change case number)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  // Verify case ownership
  const { data: caseData } = await supabase
    .from("cases")
    .select("org_id")
    .eq("id", id)
    .single();

  if (!caseData || !isAuthorized(ctx, caseData.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    monitoring_status?: string;
    external_case_number?: string;
    court_name?: string;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.monitoring_status) updates.monitoring_status = body.monitoring_status;
  if (body.external_case_number) updates.external_case_number = body.external_case_number;
  if (body.court_name !== undefined) updates.court_name = body.court_name;

  const { data, error } = await supabase
    .from("case_monitoring")
    .update(updates)
    .eq("case_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
