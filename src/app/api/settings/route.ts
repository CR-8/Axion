import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { getUserOrgId } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from("org_settings")
    .select("*")
    .eq("org_id", ctx.orgId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask sensitive fields for display
  const masked = { ...data } as Record<string, unknown>;
  if (masked.ai_api_key) masked.ai_api_key = "••••••••" + String(masked.ai_api_key).slice(-4);
  if (masked.whatsapp_access_token)
    masked.whatsapp_access_token = "••••••••" + String(masked.whatsapp_access_token).slice(-4);

  return NextResponse.json(masked);
}

export async function PATCH(request: NextRequest) {
  const ctx = await getUserOrgId(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as Record<string, unknown>;

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
    if (key in body && !String(body[key]).includes("••••••••")) {
      updates[key] = body[key];
    }
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("org_settings")
    .upsert({ org_id: ctx.orgId, ...updates }, { onConflict: "org_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
