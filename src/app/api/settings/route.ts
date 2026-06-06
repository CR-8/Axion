import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");

  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("org_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask sensitive fields
  if (data) {
    if (data.ai_api_key) data.ai_api_key = "••••••••" + data.ai_api_key.slice(-4);
    if (data.whatsapp_access_token) data.whatsapp_access_token = "••••••••" + data.whatsapp_access_token.slice(-4);
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { org_id, ...rest } = body;

  if (!org_id) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  // Don't update masked values
  const allowed = [
    "whatsapp_phone_id",
    "whatsapp_access_token",
    "whatsapp_verify_token",
    "ai_api_key",
    "ai_model",
    "bot_name",
    "default_language",
    "system_prompt",
    "notify_hearing",
    "notify_status",
    "notify_document",
    "hearing_reminder_hours",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in rest && !String(rest[key]).includes("••••••••")) {
      updates[key] = rest[key];
    }
  }

  const { data, error } = await supabase
    .from("org_settings")
    .upsert({ org_id, ...updates }, { onConflict: "org_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
