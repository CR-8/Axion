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

  const { data: doc, error } = await supabase
    .from("documents")
    .select("org_id, storage_path, name, mime_type, doc_type")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!isAuthorized(ctx, doc.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate a signed URL (valid 60 minutes)
  const { data: urlData, error: urlError } = await supabase.storage
    .from("case-documents")
    .createSignedUrl(doc.storage_path as string, 3600);

  if (urlError || !urlData) {
    return NextResponse.json(
      { error: urlError?.message || "Failed to generate URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: urlData.signedUrl,
    name: doc.name,
    mime_type: doc.mime_type,
    doc_type: doc.doc_type,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("org_id, storage_path")
    .eq("id", id)
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAuthorized(ctx, doc.org_id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.storage.from("case-documents").remove([doc.storage_path as string]);

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
