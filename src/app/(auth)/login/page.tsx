"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Scale, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <section className="h-screen flex items-center justify-center bg-[#09090b]">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm px-4">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex size-12 rounded-2xl bg-white/5 border border-white/10 items-center justify-center text-white">
            <Scale className="size-6" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white mt-1">LexBot CRM</h1>
        </div>

        {/* Card */}
        <div className="flex w-full flex-col gap-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-sm text-white/60 text-center font-medium">Sign in to your workspace</h2>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 text-red-300 text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Input
                id="email"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin mr-2 inline" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-1.5 text-sm text-white/35">
          <p>Need an account?</p>
          <Link
            href="/signup"
            className="font-medium text-white/70 hover:text-white transition-colors hover:underline underline underline-offset-4"
          >
            Create workspace
          </Link>
        </div>
      </div>
    </section>
  );
}
