"use client";

import { useState, useEffect, useCallback } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Copy, AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { LANGUAGES, CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/types";

const STEPS = ["Personal Info", "Case Details (Optional)", "Review & Create"];

export default function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; name: string; case_number?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Client personal info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("en");
  const [address, setAddress] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [notes, setNotes] = useState("");

  // Case details flow options
  const [createCaseToo, setCreateCaseToo] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [caseType, setCaseType] = useState("civil");
  const [courtName, setCourtName] = useState("");
  const [courtCity, setCourtCity] = useState("");
  const [caseStatus, setCaseStatus] = useState("active");
  const [nextHearingDate, setNextHearingDate] = useState("");
  const [assignedLawyerName, setAssignedLawyerName] = useState("");
  const [caseNotes, setCaseNotes] = useState("");

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

    try {
      // Step 1: Create client
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

      const clientData = await res.json();
      if (!res.ok) {
        throw new Error(clientData.error || "Failed to create client");
      }

      // Step 2: Optionally create case if toggled
      let caseNum = null;
      if (createCaseToo && caseNumber.trim()) {
        const caseRes = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientData.id,
            case_number: caseNumber.trim(),
            court_name: courtName.trim() || null,
            court_city: courtCity.trim() || null,
            case_type: caseType,
            status: caseStatus,
            next_hearing_date: nextHearingDate || null,
            assigned_lawyer_name: assignedLawyerName.trim() || null,
            notes: caseNotes.trim() || null,
          }),
        });

        const caseData = await caseRes.json();
        if (!caseRes.ok) {
          setError(`Client was created, but case registration failed: ${caseData.error || "Unknown error"}`);
          // Proceed to success page since client is saved
          setCreated({ id: clientData.id, name: clientData.name, case_number: null });
          setLoading(false);
          return;
        }
        caseNum = caseData.case_number;
      }

      setCreated({ id: clientData.id, name: clientData.name, case_number: caseNum });
    } catch (e: unknown) {
      setError((e as Error).message || "An error occurred during submission");
    } finally {
      setLoading(false);
    }
  }

  function copyOnboarding() {
    const caseInfo = created?.case_number
      ? `Case ID *${created.case_number}*`
      : "(please ask your lawyer for your Case ID)";
    const msg = `Hello ${created?.name}, welcome to our legal services. Your client record has been registered. Please message us on WhatsApp and provide your ${caseInfo} to verify your session and track updates.`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Success state
  if (created) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 text-center space-y-6 shadow-xl">
          <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mx-auto shadow-inner">
            <Check className="size-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Client Created successfully!</h2>
            <p className="text-white/40 text-sm mt-1">{created.name} has been added to your firm</p>
          </div>
          
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-left text-sm text-white/60 space-y-2">
            <p className="text-white/80 font-medium text-[11px] uppercase tracking-wider">WhatsApp Onboarding Message</p>
            <p className="leading-relaxed text-[13px] bg-background/50 p-3 rounded-lg border border-border-default/20 font-mono">
              Hello <strong className="text-white/80">{created.name}</strong>, welcome to our legal services. Your client record has been registered. Please message us on WhatsApp and provide your {created.case_number ? (<>Case ID <strong className="text-white font-mono font-bold underline underline-offset-4">{created.case_number}</strong></>) : (<strong className="text-white/85">assigned Case ID</strong>)} to verify your session and track updates.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyOnboarding}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.06] border border-white/[0.09] text-white/70 rounded-xl text-sm font-medium hover:bg-white/[0.09] hover:text-white transition-all cursor-pointer"
            >
              {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              {copied ? "Copied Message!" : "Copy Onboarding Message"}
            </button>
            <Link
              href={`/clients/${created.id}`}
              className="flex-1 flex items-center justify-center px-4 py-2.5 bg-white hover:bg-white/90 text-black font-bold rounded-xl text-sm transition-all shadow-sm"
            >
              View Client Details
            </Link>
          </div>
          <Link href="/clients" className="block text-white/30 text-sm hover:text-white/50 transition-colors">
            ← Back to Clients list
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
          <h1 className="text-[20px] font-bold text-white tracking-tight">New Client Onboarding</h1>
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
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5 shadow-xl">
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-red-300 text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* STEP 1: Personal Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80 border-b border-white/[0.05] pb-2">Client Details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="client-name" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Full Name *</label>
                <input
                  id="client-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ramesh Kumar"
                  required
                  autoComplete="name"
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="client-phone" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">WhatsApp Number *</label>
                <input
                  id="client-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  required
                  autoComplete="tel"
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="client-language" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Preferred Language</label>
                <select
                  id="client-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="client-id-proof" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">ID Proof Type</label>
                <select
                  id="client-id-proof"
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
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
              <label htmlFor="client-address" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Address (optional)</label>
              <input
                id="client-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, Mumbai"
                autoComplete="street-address"
                className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="client-notes" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Notes (optional)</label>
              <textarea
                id="client-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this client…"
                rows={3}
                className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Optional Case details */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-white/95">Register Case Record Now?</p>
                <p className="text-xs text-white/40 mt-0.5">Link an active court case to this client immediately</p>
              </div>
              <input
                type="checkbox"
                id="toggle-case-creation"
                checked={createCaseToo}
                onChange={(e) => setCreateCaseToo(e.target.checked)}
                className="rounded border-white/[0.12] bg-zinc-900 text-white focus:ring-primary size-5 cursor-pointer"
              />
            </div>

            {createCaseToo && (
              <div className="space-y-4 animate-fade-in-up">
                <h3 className="text-sm font-semibold text-white/85 border-b border-white/[0.05] pb-2 flex items-center gap-2">
                  <Sparkles className="size-4 text-primary animate-pulse" />
                  Case Details
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="case-number" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Case Number *</label>
                    <input
                      id="case-number"
                      type="text"
                      value={caseNumber}
                      onChange={(e) => setCaseNumber(e.target.value)}
                      placeholder="OS/123/2026"
                      required={createCaseToo}
                      className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="case-type" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Case Type</label>
                    <select
                      id="case-type"
                      value={caseType}
                      onChange={(e) => setCaseType(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                    >
                      {Object.keys(CASE_TYPE_LABELS).map((type) => (
                        <option key={type} value={type}>{CASE_TYPE_LABELS[type as keyof typeof CASE_TYPE_LABELS]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="court-name" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Court Name</label>
                    <input
                      id="court-name"
                      type="text"
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                      placeholder="High Court of Bombay"
                      className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="court-city" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Court City</label>
                    <input
                      id="court-city"
                      type="text"
                      value={courtCity}
                      onChange={(e) => setCourtCity(e.target.value)}
                      placeholder="Mumbai"
                      className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="case-status" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Status</label>
                    <select
                      id="case-status"
                      value={caseStatus}
                      onChange={(e) => setCaseStatus(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                    >
                      {Object.keys(CASE_STATUS_LABELS).map((status) => (
                        <option key={status} value={status}>{CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="next-hearing-date" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Next Hearing Date</label>
                    <input
                      id="next-hearing-date"
                      type="date"
                      value={nextHearingDate}
                      onChange={(e) => setNextHearingDate(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="assigned-lawyer" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Assigned Lawyer Name</label>
                  <input
                    id="assigned-lawyer"
                    type="text"
                    value={assignedLawyerName}
                    onChange={(e) => setAssignedLawyerName(e.target.value)}
                    placeholder="Adv. Harish Salve"
                    className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="case-notes" className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Case Notes</label>
                  <textarea
                    id="case-notes"
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    placeholder="Provide case background notes..."
                    rows={2}
                    className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors resize-none"
                  />
                </div>
              </div>
            )}
            {!createCaseToo && (
              <div className="py-8 text-center text-white/30 text-xs">
                You can add cases to this client later from the Cases page.
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-white/80 font-semibold text-sm border-b border-white/[0.05] pb-2">Review Client & Case Details</h3>
            
            <div className="space-y-2 text-sm">
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Client Info</p>
              {[
                ["Name", name],
                ["Phone", phone],
                ["Language", LANGUAGES.find((l) => l.code === language)?.label],
                ["ID Proof", idProofType || "Not provided"],
                ["Address", address || "Not provided"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 py-1.5 border-b border-white/[0.03] text-xs">
                  <span className="text-white/35 w-28 shrink-0">{label}</span>
                  <span className="text-white/75 font-medium">{value}</span>
                </div>
              ))}
            </div>

            {createCaseToo && (
              <div className="space-y-2 text-sm pt-3">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Linked Case Info</p>
                {[
                  ["Case Number", caseNumber],
                  ["Type", CASE_TYPE_LABELS[caseType as keyof typeof CASE_TYPE_LABELS]],
                  ["Court", courtName || "Not provided"],
                  ["Court City", courtCity || "Not provided"],
                  ["Status", CASE_STATUS_LABELS[caseStatus as keyof typeof CASE_STATUS_LABELS]],
                  ["Hearing Date", nextHearingDate || "Not provided"],
                  ["Assigned Lawyer", assignedLawyerName || "Not provided"],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3 py-1.5 border-b border-white/[0.03] text-xs">
                    <span className="text-white/35 w-28 shrink-0">{label}</span>
                    <span className="text-white/75 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation actions */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          )}
          <button
            id="client-form-next"
            onClick={() => {
              if (step === 0) {
                if (!name.trim() || !phone.trim()) {
                  setError("Name and phone number are required");
                  return;
                }
                setError(null);
                setStep(1);
              } else if (step === 1) {
                if (createCaseToo && !caseNumber.trim()) {
                  setError("Case number is required when case registration is toggled");
                  return;
                }
                setError(null);
                setStep(2);
              } else {
                void handleCreate();
              }
            }}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold text-sm rounded-xl py-2.5 transition-colors cursor-pointer shadow-sm"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Creating records…" : step < STEPS.length - 1 ? "Continue →" : "Register Client & Case"}
          </button>
        </div>
      </div>
    </div>
  );
}
