"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Phone, User, FileText, Briefcase, Loader2, Plus, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { CASE_STATUS_LABELS, LANGUAGES, type CaseStatus } from "@/lib/types";

interface ClientDetail {
  id: string;
  name: string;
  phone: string;
  preferred_language: string;
  address: string | null;
  id_proof_type: string | null;
  notes: string | null;
  created_at: string;
  cases: Array<{
    id: string;
    case_number: string;
    status: CaseStatus;
    court_name: string | null;
    next_hearing_date: string | null;
    assigned_lawyer_name: string | null;
    case_type: string;
  }>;
}

const NEUTRAL_STATUS_COLORS: Record<CaseStatus, string> = {
  active: "text-zinc-100 bg-white/[0.08] border-white/[0.12]",
  hearing_scheduled: "text-zinc-200 bg-white/[0.05] border-white/[0.08]",
  adjourned: "text-zinc-400 bg-white/[0.03] border-white/[0.05]",
  judgement_pending: "text-zinc-300 bg-white/[0.04] border-white/[0.06]",
  closed: "text-white/20 bg-white/[0.01] border-white/[0.03]",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to load client detail.");
      }
      setClient(await res.json());
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred while loading the client details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadClient(); }, [loadClient]);

  const handleRetry = () => {
    void loadClient();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] gap-3">
        <Loader2 className="size-6 text-white/50 animate-spin" />
        <span className="text-white/30 text-xs">Loading client details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-red-500/[0.02] border border-red-500/10 rounded-3xl gap-4 max-w-md mx-auto my-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="size-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="text-red-400 font-semibold text-[15px]">Failed to Load Client</h3>
          <p className="text-white/35 text-xs leading-relaxed max-w-[280px]">{error}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/clients"
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] text-white/70 font-medium text-xs rounded-xl transition-all"
          >
            Back to Clients
          </Link>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-white hover:bg-white/90 text-black font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/[0.02] border border-white/[0.05] rounded-3xl gap-4 max-w-md mx-auto my-12">
        <div className="size-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/30">
          <User className="size-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="text-white/80 font-semibold text-[15px]">Client Not Found</h3>
          <p className="text-white/30 text-xs leading-relaxed">This client does not exist or has been removed.</p>
        </div>
        <Link
          href="/clients"
          className="px-4 py-2.5 bg-white hover:bg-white/90 text-black font-semibold text-xs rounded-xl transition-colors"
        >
          Back to Clients
        </Link>
      </div>
    );
  }

  const langLabel = LANGUAGES.find((l) => l.code === client.preferred_language)?.label || client.preferred_language;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clients" className="size-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg font-bold">
            {client.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-white tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-1.5 text-white/35 text-[12px] font-mono mt-0.5">
              <Phone className="size-3" />
              {client.phone}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — client details */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <User className="size-3.5" />
              Client Details
            </h2>
            <div className="space-y-3 text-sm">
              {[
                ["Language", langLabel],
                ["ID Proof", client.id_proof_type ? client.id_proof_type.replace("_", " ").toUpperCase() : "Not provided"],
                ["Address", client.address || "Not provided"],
                ["Added", new Date(client.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 py-2 border-b border-white/[0.05]">
                  <span className="text-white/25 w-24 shrink-0 text-[12px]">{label}</span>
                  <span className="text-white/65 font-medium capitalize truncate">{value}</span>
                </div>
              ))}
            </div>
            {client.notes && (
              <div className="bg-white/[0.02] rounded-xl p-3 text-sm text-white/50">{client.notes}</div>
            )}
          </div>

          {/* Onboarding message */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-2">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Onboarding Message</p>
            <p className="text-sm text-white/60 leading-relaxed">
              Hello <strong className="text-white/80">{client.name}</strong>, your case details have been registered with us. To track your case, please message us on WhatsApp and share your Case ID (provided by your lawyer).
            </p>
          </div>
        </div>

        {/* Right — cases */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="size-3.5" />
                Cases ({client.cases?.length || 0})
              </h2>
              <Link
                href={`/cases/new?client_id=${client.id}`}
                className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white transition-colors"
              >
                <Plus className="size-3" />
                Add Case
              </Link>
            </div>

            {(!client.cases || client.cases.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white/[0.01] border border-white/[0.04] border-dashed rounded-2xl gap-3">
                <Briefcase className="size-8 text-white/20" strokeWidth={1.4} />
                <div className="space-y-0.5">
                  <p className="text-white/60 text-sm font-medium">No cases linked yet</p>
                  <p className="text-white/20 text-xs">Create a case file to track schedules and hearings for this client.</p>
                </div>
                <Link
                  href={`/cases/new?client_id=${client.id}`}
                  className="mt-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold rounded-lg transition-colors"
                >
                  + Create Case File
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {client.cases.map((c) => {
                  const hearing = c.next_hearing_date
                    ? new Date(c.next_hearing_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : null;
                  return (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.07] rounded-xl transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="font-mono text-[13px] font-medium text-white/80">{c.case_number}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${NEUTRAL_STATUS_COLORS[c.status]}`}>
                            {CASE_STATUS_LABELS[c.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/30">
                          {c.court_name && <span className="truncate max-w-40"><FileText className="size-3 inline mr-1 shrink-0" />{c.court_name}</span>}
                          {hearing && <span className="shrink-0">📅 {hearing}</span>}
                          {c.assigned_lawyer_name && <span className="truncate max-w-32">👨‍⚖️ {c.assigned_lawyer_name}</span>}
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
