import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getUserOrgId } from "@/lib/auth-guard";

// GET /api/clients?search=xxx&status=xxx
export async function GET(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  const supabase = getAdminSupabase();
  let query = supabase
    .from("clients")
    .select(`
      *,
      cases(id, case_number, status, next_hearing_date, assigned_lawyer_name)
    `)
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let result = data || [];
  if (status) {
    result = result.filter((c: { cases?: { status: string }[] }) =>
      c.cases?.some((cs) => cs.status === status),
    );
  }

  return NextResponse.json(result);
}

// POST /api/clients — create new client
export async function POST(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    phone?: string;
    preferred_language?: string;
    address?: string;
    id_proof_type?: string;
    notes?: string;
  };
  const { name, phone, preferred_language, address, id_proof_type, notes } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      org_id: ctx.orgId,
      name: name.trim(),
      phone: phone.trim(),
      preferred_language: preferred_language || "en",
      address: address || null,
      id_proof_type: id_proof_type || null,
      notes: notes || null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send WhatsApp welcome message (no phantom case created)
  const msg = `Hello ${client.name}, welcome to our legal services. Your client profile has been registered. Your lawyer will share your Case ID shortly so you can track updates via WhatsApp.`;

  try {
    await sendWhatsAppMessage(client.phone, msg, ctx.orgId);
  } catch (err) {
    console.error("Failed to send WhatsApp welcome message:", err);
  }

  return NextResponse.json(client, { status: 201 });
}
