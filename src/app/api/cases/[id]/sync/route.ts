import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId, isAuthorized } from "@/lib/auth-guard";
import { syncCase } from "@/lib/case-sync";

// POST /api/cases/[id]/sync — trigger a manual sync
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
    .select("org_id")
    .eq("id", id)
    .single();

  if (!caseData || !isAuthorized(ctx, caseData.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get monitoring record
  const { data: monitoring } = await supabase
    .from("case_monitoring")
    .select("id, monitoring_status")
    .eq("case_id", id)
    .maybeSingle();

  if (!monitoring) {
    return NextResponse.json(
      { error: "Monitoring not enabled for this case. Enable monitoring first." },
      { status: 400 },
    );
  }

  if (monitoring.monitoring_status === "paused") {
    return NextResponse.json(
      { error: "Monitoring is paused. Resume it before syncing." },
      { status: 400 },
    );
  }

  // Run the sync
  const result = await syncCase(id, monitoring.id as string);

  return NextResponse.json(result);
}
