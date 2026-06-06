import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient as createSSRClient, createBrowserClient } from "@supabase/ssr";
import type { cookies } from "next/headers";

// ── Server-side admin client (service role, no RLS) ─────────
let _adminClient: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _adminClient;
}
// Proxy for backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const admin = getAdminSupabase();
    const value = (admin as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(admin);
    }
    return value;
  },
});

// ── Server-side client with user session (for auth-gated routes) ──
export function createServerClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    },
  );
}

// ── Browser client (for client components) ──────────────────
let _browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _browserClient;
}
