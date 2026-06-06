import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const caseId = searchParams.get("case_id");
  const docType = searchParams.get("doc_type");

  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  let query = supabase
    .from("documents")
    .select(`*, cases(case_number), clients(name)`)
    .eq("org_id", orgId)
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
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const orgId = formData.get("org_id") as string;
  const caseId = formData.get("case_id") as string;
  const clientId = formData.get("client_id") as string;
  const docType = (formData.get("doc_type") as string) || "other";
  const uploadedByName = (formData.get("uploaded_by_name") as string) || null;

  if (!file || !orgId || !caseId || !clientId) {
    return NextResponse.json(
      { error: "file, org_id, case_id, client_id are required" },
      { status: 400 },
    );
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop();
  const storagePath = `${orgId}/${caseId}/${Date.now()}-${file.name}`;

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

  // Insert document record
  const { data, error } = await supabase
    .from("documents")
    .insert({
      org_id: orgId,
      case_id: caseId,
      client_id: clientId,
      name: file.name,
      doc_type: docType,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      source: "dashboard",
      uploaded_by_name: uploadedByName,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log case event
  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "document_uploaded",
    new_value: file.name,
    created_by_name: uploadedByName,
  });

  return NextResponse.json(data, { status: 201 });
}
