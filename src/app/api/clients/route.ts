import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import crypto from "crypto";

// GET /api/clients?org_id=xxx&search=xxx&status=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  let query = supabase
    .from("clients")
    .select(`
      *,
      cases(id, case_number, status, next_hearing_date, assigned_lawyer_name)
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If filtering by case status, filter in JS (after join)
  let result = data || [];
  if (status) {
    result = result.filter((c: any) =>
      c.cases?.some((cs: any) => cs.status === status),
    );
  }

  return NextResponse.json(result);
}

// POST /api/clients — create new client
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { org_id, name, phone, preferred_language, address, id_proof_type, notes, created_by } = body;

  if (!org_id || !name || !phone) {
    return NextResponse.json({ error: "org_id, name, phone are required" }, { status: 400 });
  }

  // 1. Insert Client
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      org_id,
      name: name.trim(),
      phone: phone.trim(),
      preferred_language: preferred_language || "en",
      address: address || null,
      id_proof_type: id_proof_type || null,
      notes: notes || null,
      created_by: created_by || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Generate random number using UUID
  const uuid = crypto.randomUUID();
  const digits = uuid.replace(/[^0-9]/g, "");
  const randNum = digits.length >= 6 ? digits.slice(0, 6) : Math.floor(100000 + Math.random() * 900000).toString();
  const caseNumber = `CL-${randNum}`;

  // 3. Create default case for identity mapping
  const { error: caseError } = await supabase
    .from("cases")
    .insert({
      org_id,
      client_id: client.id,
      case_number: caseNumber,
      court_name: "Lucknow Civil Court",
      case_type: "other",
      status: "active",
      created_by: created_by || null,
    });

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 });
  }

  // 4. Send WhatsApp message automatically
  const msg = `Hello ${client.name}, welcome to our legal services. Your case details have been registered. Please message us on WhatsApp with your Case ID *${caseNumber}* to track updates.`;

  try {
    await sendWhatsAppMessage(client.phone, msg);
  } catch (err: any) {
    console.error("Failed to send WhatsApp onboarding message:", err);
  }

  return NextResponse.json({ ...client, case_number: caseNumber }, { status: 201 });
}
