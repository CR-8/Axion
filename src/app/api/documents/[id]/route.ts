import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: doc, error } = await supabase
    .from("documents")
    .select("storage_path, name, mime_type, doc_type")
    .eq("id", id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Generate a signed URL (valid 60 minutes)
  const { data: urlData, error: urlError } = await supabase.storage
    .from("case-documents")
    .createSignedUrl(doc.storage_path, 3600);

  if (urlError || !urlData) {
    return NextResponse.json({ error: urlError?.message || "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: urlData.signedUrl,
    name: doc.name,
    mime_type: doc.mime_type,
    doc_type: doc.doc_type,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (doc) {
    await supabase.storage.from("case-documents").remove([doc.storage_path]);
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
