import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("case_id");
  const docType = searchParams.get("doc_type");

  const supabase = getAdminSupabase();
  let query = supabase
    .from("documents")
    .select(`*, cases(case_number), clients(name)`)
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (caseId) query = query.eq("case_id", caseId);
  if (docType) query = query.eq("doc_type", docType);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const caseId = formData.get("case_id") as string;
  const clientId = formData.get("client_id") as string;
  const docType = (formData.get("doc_type") as string) || "other";
  const uploadedByName = (formData.get("uploaded_by_name") as string) || null;

  if (!file || !caseId || !clientId) {
    return NextResponse.json(
      { error: "file, case_id, and client_id are required" },
      { status: 400 },
    );
  }

  const supabase = getAdminSupabase();

  // Verify case belongs to caller's org before uploading
  const { data: caseRecord } = await supabase
    .from("cases")
    .select("org_id")
    .eq("id", caseId)
    .single();

  if (!caseRecord || caseRecord.org_id !== ctx.orgId) {
    return NextResponse.json({ error: "Case not found or forbidden" }, { status: 403 });
  }

  const storagePath = `${ctx.orgId}/${caseId}/${Date.now()}-${file.name}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("case-documents")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      org_id: ctx.orgId,
      case_id: caseId,
      client_id: clientId,
      name: file.name,
      doc_type: docType,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      source: "dashboard",
      uploaded_by: ctx.userId,
      uploaded_by_name: uploadedByName,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "document_uploaded",
    new_value: file.name,
    created_by: ctx.userId,
    created_by_name: uploadedByName,
  });

  return NextResponse.json(data, { status: 201 });
}
