import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LEGAL_SYSTEM_PROMPT } from "@/lib/system-prompt";

// Called during signup to create org + member record.
// Requires an active Supabase session; the session user's ID must match the
// userId in the request body to prevent one user creating an org for another.
export async function POST(request: NextRequest) {
  // 1. Verify the caller is the authenticated user
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Read-only here — session is already set
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    userId?: string;
    email?: string;
    fullName?: string;
    orgName?: string;
    orgType?: string;
    city?: string;
  };
  const { userId, email, fullName, orgName, orgType, city } = body;

  // 2. Session user must match the userId in the request body
  if (!userId || userId !== user.id) {
    return NextResponse.json(
      { error: "Session user does not match provided userId" },
      { status: 403 },
    );
  }

  if (!orgName) {
    return NextResponse.json({ error: "orgName is required" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName, type: orgType || "law_firm", city: city || null })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: orgError?.message || "Failed to create org" },
      { status: 500 },
    );
  }

  // Create org_member (admin role for the signup user)
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
    full_name: fullName || null,
    email: email || user.email || null,
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
