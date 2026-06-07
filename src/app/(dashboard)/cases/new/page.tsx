"use client";

import { useState, useEffect, useCallback } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Briefcase, ArrowLeft, Loader2, AlertCircle, Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS, type CaseStatus, type CaseType } from "@/lib/types";

// UI Components
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface ClientOption { id: string; name: string; phone: string; }

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [lawyers, setLawyers] = useState<Array<{ user_id: string; full_name: string | null; email: string | null }>>([]);

  const [clientId, setClientId] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [courtName, setCourtName] = useState("");
  const [courtCity, setCourtCity] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("civil");
  const [status, setStatus] = useState<CaseStatus>("active");
  const [hearingDate, setHearingDate] = useState("");
  const [lawyerId, setLawyerId] = useState("");
  const [lawyerName, setLawyerName] = useState("");
  const [ecourtsUrl, setEcourtsUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [openClientCombo, setOpenClientCombo] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
    if (!m?.org_id) return;
    setOrgId(m.org_id);

    const [clientsRes, lawyersRes] = await Promise.all([
      supabase.from("clients").select("id, name, phone").eq("org_id", m.org_id).order("name"),
      supabase.from("org_members").select("user_id, full_name, email").eq("org_id", m.org_id).in("role", ["admin", "lawyer"]),
    ]);

    setClients(clientsRes.data || []);
    setLawyers(lawyersRes.data || []);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
  useEffect(() => { void loadData(); }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !clientId || !caseNumber) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    const selectedLawyer = lawyers.find((l) => l.user_id === lawyerId);

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        client_id: clientId,
        case_number: caseNumber.trim(),
        court_name: courtName || null,
        court_city: courtCity || null,
        case_type: caseType,
        status,
        next_hearing_date: hearingDate || null,
        assigned_lawyer_id: lawyerId || null,
        assigned_lawyer_name: selectedLawyer?.full_name || selectedLawyer?.email || lawyerName || null,
        ecourts_url: ecourtsUrl || null,
        notes: notes || null,
        created_by: userId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create case");
      setLoading(false);
      return;
    }

    router.push(`/cases/${data.id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cases" className="size-8 rounded-xl flex items-center justify-center bg-surface border border-border-default text-text-secondary hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">New Case</h1>
          <p className="text-text-secondary text-sm">Create a new case and link it to a client</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-surface border border-border-default rounded-2xl p-6 space-y-5 shadow-xl">
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-red-300 text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2 flex flex-col">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Client *</label>
            <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
              <PopoverTrigger asChild>
                <Button
                  id="case-client-trigger"
                  role="combobox"
                  aria-expanded={openClientCombo}
                  className="w-full justify-between text-left font-normal bg-background border border-border-default hover:bg-white/5 text-foreground h-[42px] px-4 rounded-xl cursor-pointer"
                >
                  {clientId
                    ? clients.find((c) => c.id === clientId)?.name || "Select client…"
                    : <span className="text-text-secondary/60">Select a client…</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-text-secondary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-md p-0 bg-surface border border-border-default rounded-xl" align="start">
                <Command>
                  <CommandInput placeholder="Search client by name or phone…" className="border-none focus:ring-0 text-foreground" />
                  <CommandList className="max-h-[200px] overflow-y-auto">
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.phone}`}
                          onSelect={() => {
                            setClientId(c.id);
                            setOpenClientCombo(false);
                          }}
                          className="flex items-center justify-between px-3.5 py-2 text-sm hover:bg-white/5 rounded-lg cursor-pointer text-foreground"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-[10px] text-text-secondary">{c.phone}</span>
                          </div>
                          {clientId === c.id && <Check className="h-4 w-4 text-foreground" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {clients.length === 0 && (
              <p className="text-zinc-400 text-xs mt-1">No clients found. <Link href="/clients/new" className="underline hover:text-white transition-colors">Add a client first.</Link></p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Case Number *</label>
            <input
              id="case-number"
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g. CC/2026/0042 or LF-2024-0042"
              list="case-number-formats"
              required
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/20 outline-none focus:border-white/20 transition-colors font-mono"
            />
            <datalist id="case-number-formats">
              <option value="OS/123/2026" />
              <option value="CC/2026/0042" />
              <option value="CIVIL/42/2026" />
              <option value="CRIM/156/2026" />
              <option value="WP/2026/00123" />
              <option value="FA/2026/0089" />
              <option value="LF-2024-0042" />
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Case Type</label>
            <select
              id="case-type"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-white/20 transition-colors"
            >
              {(Object.keys(CASE_TYPE_LABELS) as CaseType[]).map((t) => (
                <option key={t} value={t} className="bg-surface">{CASE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Court Name</label>
            <input
              id="court-name"
              type="text"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="Select or type court name"
              list="court-names"
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/20 outline-none focus:border-white/20 transition-colors"
            />
            <datalist id="court-names">
              <option value="Supreme Court of India" />
              <option value="High Court of Bombay" />
              <option value="High Court of Delhi" />
              <option value="High Court of Calcutta" />
              <option value="High Court of Madras" />
              <option value="High Court of Karnataka" />
              <option value="High Court of Gujarat" />
              <option value="High Court of Allahabad" />
              <option value="High Court of Punjab & Haryana" />
              <option value="City Civil Court, Mumbai" />
              <option value="District Court, Delhi" />
              <option value="District Court, Bangalore" />
              <option value="Sessions Court, Pune" />
              <option value="Family Court, Mumbai" />
              <option value="Consumer Disputes Redressal Forum" />
              <option value="Debt Recovery Tribunal" />
              <option value="National Company Law Tribunal" />
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Court City</label>
            <input
              id="court-city"
              type="text"
              value={courtCity}
              onChange={(e) => setCourtCity(e.target.value)}
              placeholder="Select or type city"
              list="court-cities"
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/20 outline-none focus:border-white/20 transition-colors"
            />
            <datalist id="court-cities">
              <option value="Mumbai" />
              <option value="Delhi" />
              <option value="Bangalore" />
              <option value="Chennai" />
              <option value="Kolkata" />
              <option value="Hyderabad" />
              <option value="Ahmedabad" />
              <option value="Pune" />
              <option value="Jaipur" />
              <option value="Lucknow" />
              <option value="Chandigarh" />
              <option value="Bhopal" />
              <option value="Patna" />
              <option value="Surat" />
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Status</label>
            <select
              id="case-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-white/20 transition-colors"
            >
              {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
                <option key={s} value={s} className="bg-surface">{CASE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Next Hearing Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="hearing-date-trigger"
                  className="w-full justify-start text-left font-normal bg-background border border-border-default hover:bg-white/5 text-foreground h-[42px] px-4 rounded-xl cursor-pointer"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-text-secondary" />
                  {hearingDate ? format(new Date(hearingDate), "PPP") : <span className="text-text-secondary/60">Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-surface border border-border-default rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={hearingDate ? new Date(hearingDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const offset = date.getTimezoneOffset();
                      const localDate = new Date(date.getTime() - offset * 60 * 1000);
                      setHearingDate(localDate.toISOString().split("T")[0]!);
                    } else {
                      setHearingDate("");
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Assigned Lawyer</label>
            <select
              id="case-lawyer"
              value={lawyerId}
              onChange={(e) => {
                setLawyerId(e.target.value);
                const l = lawyers.find((lw) => lw.user_id === e.target.value);
                setLawyerName(l?.full_name || l?.email || "");
              }}
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-white/20 transition-colors"
            >
              <option value="" className="bg-surface">Unassigned</option>
              {lawyers.map((l) => (
                <option key={l.user_id} value={l.user_id} className="bg-surface">{l.full_name || l.email}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">eCourts URL (optional)</label>
            <input
              id="ecourts-url"
              type="url"
              value={ecourtsUrl}
              onChange={(e) => setEcourtsUrl(e.target.value)}
              placeholder="https://ecourts.gov.in/…"
              list="ecourts-urls"
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/20 outline-none focus:border-white/20 transition-colors font-mono text-[12px]"
            />
            <datalist id="ecourts-urls">
              <option value="https://ecourts.gov.in/" />
              <option value="https://services.ecourts.gov.in/" />
              <option value="https://delhicourts.nic.in/" />
              <option value="https://bombayhighcourt.nic.in/" />
              <option value="https://www.sci.gov.in/" />
            </datalist>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider">Notes (optional)</label>
            <textarea
              id="case-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes…"
              className="w-full bg-background border border-border-default rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-secondary/20 outline-none focus:border-white/20 transition-colors resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          id="create-case-submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 font-semibold text-sm rounded-xl py-2.5 transition-colors cursor-pointer"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Briefcase className="size-4" />}
          {loading ? "Creating…" : "Create Case"}
        </button>
      </form>
    </div>
  );
}
