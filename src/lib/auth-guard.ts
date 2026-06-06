// auth-guard.ts
// Server-side helper to extract the authenticated user's org from their session cookie.
// Use this in every protected API route instead of trusting caller-supplied org_id.

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export interface AuthContext {
  userId: string;
  orgId: string;
}

/**
 * Resolves the authenticated user's org from the request cookies.
 * Returns null if the user is not authenticated or has no org membership.
 */
export async function getUserOrgId(
  request: NextRequest,
): Promise<AuthContext | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Read-only in route handlers — safe to ignore
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!member?.org_id) return null;

  return { userId: user.id, orgId: member.org_id };
}

/**
 * Verifies that a resource's org_id matches the authenticated user's org_id.
 * Returns true if the user may access the resource.
 */
export function isAuthorized(
  ctx: AuthContext,
  resourceOrgId: string | null | undefined,
): boolean {
  if (!resourceOrgId) return false;
  return ctx.orgId === resourceOrgId;
}
