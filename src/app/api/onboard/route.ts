import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEFAULT_LEGAL_SYSTEM_PROMPT } from "@/lib/system-prompt";

// Called during signup to create org + member record
export async function POST(request: NextRequest) {
  const { userId, email, fullName, orgName, orgType, city } = await request.json();

  if (!userId || !orgName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName, type: orgType || "law_firm", city: city || null })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message || "Failed to create org" }, { status: 500 });
  }

  // Create org_member (admin role for the signup user)
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "admin",
    full_name: fullName || null,
    email: email || null,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Create default org_settings
  await supabase.from("org_settings").insert({
    org_id: org.id,
    ai_model: process.env.AI_MODEL || "openai/gpt-4o-mini",
    bot_name: "LexAssist",
    system_prompt: DEFAULT_LEGAL_SYSTEM_PROMPT,
  });

  return NextResponse.json({ org_id: org.id }, { status: 201 });
}
