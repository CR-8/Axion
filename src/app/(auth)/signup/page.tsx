"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Scale, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("law_firm");
  const [city, setCity] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = getBrowserSupabase();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      setError(authError?.message || "Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Create organization via API
    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: authData.user.id,
        email,
        fullName,
        orgName,
        orgType,
        city,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to set up your workspace.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
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

        {/* Step indicator */}
        <div className="flex items-center gap-2 w-full">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-white" : "bg-white/10"}`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="flex w-full flex-col gap-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-[15px] text-white/80 font-semibold">
            {step === 1 ? "Create your account" : "About your firm"}
          </h2>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 text-red-300 text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {step === 1 && (
              <>
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    type="text"
                    placeholder="Adv. Priya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@firm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="org-name">Firm Name</Label>
                  <Input
                    id="org-name"
                    type="text"
                    placeholder="Sharma & Associates"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="org-type">Organization Type</Label>
                  <select
                    id="org-type"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-white/[0.09] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/20 transition-colors"
                  >
                    <option value="law_firm" className="bg-[#09090b] text-white">Law Firm</option>
                    <option value="legal_aid" className="bg-[#09090b] text-white">Legal Aid NGO</option>
                    <option value="court_agency" className="bg-[#09090b] text-white">Court Agency</option>
                    <option value="other" className="bg-[#09090b] text-white">Other</option>
                  </select>
                </div>
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin mr-2 inline" /> : null}
              {loading ? "Creating workspace..." : step === 1 ? "Continue" : "Create Workspace"}
            </Button>

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-white/40 text-xs hover:text-white/60 transition-colors py-1"
              >
                ← Back to details
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-1.5 text-sm text-white/35">
          <p>Already a user?</p>
          <Link
            href="/login"
            className="font-medium text-white/70 hover:text-white transition-colors hover:underline underline underline-offset-4"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}
