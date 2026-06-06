"use client";

import { useState, useEffect, useCallback } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Users, ArrowLeft, Check, Loader2, Copy, AlertCircle } from "lucide-react";
import Link from "next/link";
import { LANGUAGES } from "@/lib/types";

const STEPS = ["Personal Info", "Review & Create"];

export default function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; name: string; case_number?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("en");
  const [address, setAddress] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [notes, setNotes] = useState("");

  const loadUser = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
    if (m?.org_id) setOrgId(m.org_id);
  }, []);

  useEffect(() => { void loadUser(); }, [loadUser]);

  async function handleCreate() {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        name: name.trim(),
        phone: phone.trim(),
        preferred_language: language,
        address: address || null,
        id_proof_type: idProofType || null,
        notes: notes || null,
        created_by: userId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create client");
      setLoading(false);
      return;
    }

    setCreated({ id: data.id, name: data.name });
    setLoading(false);
  }

  function copyOnboarding() {
    const msg = `Hello ${created?.name}, welcome to our legal services. Your case details have been registered. Please message us on WhatsApp with your Case ID *${created?.case_number}* to track updates.`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Success state ──────────────────────────────────────────
  if (created) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 text-center space-y-6">
          <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mx-auto">
            <Check className="size-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Client Created!</h2>
            <p className="text-white/40 text-sm mt-1">{created.name} has been added to your firm</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-left text-sm text-white/60 space-y-2">
            <p className="text-white/80 font-medium text-[12px] uppercase tracking-wider">Onboarding Message</p>
            <p className="leading-relaxed">
              Hello <strong className="text-white/80">{created.name}</strong>, welcome to our legal services. Your case details have been registered. Please message us on WhatsApp with your Case ID <strong className="text-white font-mono font-bold underline underline-offset-4">{created.case_number}</strong> to track updates.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyOnboarding}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.06] border border-white/[0.09] text-white/70 rounded-xl text-sm font-medium hover:bg-white/[0.09] transition-colors"
            >
              {copied ? <Check className="size-4 text-white" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy Onboarding Message"}
            </button>
            <Link
              href={`/clients/${created.id}`}
              className="flex-1 flex items-center justify-center px-4 py-2.5 bg-white hover:bg-white/90 text-black font-bold rounded-xl text-sm transition-colors"
            >
              View Client
            </Link>
          </div>
          <Link href="/clients" className="block text-white/30 text-sm hover:text-white/50 transition-colors">
            ← Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clients" className="size-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-tight">New Client</h1>
          <p className="text-white/35 text-sm">{STEPS[step]}</p>
        </div>
      </div>

      {/* Step bar */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-white" : "bg-white/10"}`} />
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-red-300 text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Full Name *</label>
                <input
                  id="client-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ramesh Kumar"
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">WhatsApp Number *</label>
                <input
                  id="client-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Preferred Language</label>
                <select
                  id="client-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 outline-none focus:border-white/20 transition-colors"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">ID Proof Type</label>
                <select
                  id="client-id-proof"
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 outline-none focus:border-white/20 transition-colors"
                >
                  <option value="">Select (optional)</option>
                  <option value="aadhaar">Aadhaar</option>
                  <option value="pan">PAN Card</option>
                  <option value="passport">Passport</option>
                  <option value="voter_id">Voter ID</option>
                  <option value="driving_license">Driving License</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Address (optional)</label>
              <input
                id="client-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, Mumbai"
                className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Notes (optional)</label>
              <textarea
                id="client-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this client…"
                rows={3}
                className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-white/70 font-semibold text-sm">Review Client Details</h3>
            <div className="space-y-2 text-sm">
              {[
                ["Name", name],
                ["Phone", phone],
                ["Language", LANGUAGES.find((l) => l.code === language)?.label],
                ["ID Proof", idProofType || "Not provided"],
                ["Address", address || "Not provided"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 py-2 border-b border-white/[0.05]">
                  <span className="text-white/30 w-28 shrink-0">{label}</span>
                  <span className="text-white/75 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            id="client-form-next"
            onClick={() => {
              if (step < STEPS.length - 1) {
                if (!name.trim() || !phone.trim()) {
                  setError("Name and phone number are required");
                  return;
                }
                setError(null);
                setStep((s) => s + 1);
              } else {
                void handleCreate();
              }
            }}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold text-sm rounded-xl py-2.5 transition-colors"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Creating…" : step < STEPS.length - 1 ? "Continue →" : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
