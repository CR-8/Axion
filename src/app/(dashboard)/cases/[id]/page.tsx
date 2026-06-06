"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, User, FileText, Clock, Loader2, CheckCircle2, AlertCircle, Edit2, Bell } from "lucide-react";
import Link from "next/link";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS, type CaseStatus, type CaseType } from "@/lib/types";

interface CaseDetail {
  id: string;
  case_number: string;
  court_name: string | null;
  court_city: string | null;
  case_type: CaseType;
  status: CaseStatus;
  next_hearing_date: string | null;
  assigned_lawyer_name: string | null;
  notes: string | null;
  created_at: string;
  clients: { id: string; name: string; phone: string; preferred_language: string } | null;
  case_events: Array<{
    id: string;
    event_type: string;
    old_value: string | null;
    new_value: string | null;
    created_by_name: string | null;
    created_at: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    doc_type: string;
    created_at: string;
    source: string;
    uploaded_by_name: string | null;
  }>;
}
const NEUTRAL_STATUS_COLORS: Record<CaseStatus, string> = {
  active: "text-zinc-100 bg-white/[0.08] border-white/[0.12]",
  hearing_scheduled: "text-zinc-200 bg-white/[0.05] border-white/[0.08]",
  adjourned: "text-zinc-400 bg-white/[0.03] border-white/[0.05]",
  judgement_pending: "text-zinc-300 bg-white/[0.04] border-white/[0.06]",
  closed: "text-white/20 bg-white/[0.01] border-white/[0.03]",
};
export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  // router kept for potential future navigation use
  void useRouter;
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<CaseStatus | "">("");
  const [newHearing, setNewHearing] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${id}`);
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to load case detail.");
      }
      const data = await res.json();
      setCaseData(data);
      setNewStatus(data.status);
      setNewHearing(data.next_hearing_date || "");
    } catch (e: unknown) {
      setError((e as Error).message || "An unexpected error occurred while loading the case details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadCase(); }, [loadCase]);

  async function handleUpdate() {
    if (!caseData) return;
    setUpdating(true);
    try {
      const updates: Record<string, string> = {};
      if (newStatus && newStatus !== caseData.status) updates.status = newStatus;
      if (newHearing !== (caseData.next_hearing_date || "")) updates.next_hearing_date = newHearing;

      if (Object.keys(updates).length === 0) { setUpdating(false); return; }

      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to save update.");
      await loadCase();
    } catch (e: unknown) {
      alert((e as Error).message || "Failed to update case.");
    } finally {
      setUpdating(false);
    }
  }

  async function sendReminder() {
    if (!caseData?.clients) return;
    setSendingNotif(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: caseData.clients.id,
          case_id: id,
          type: "hearing_reminder",
        }),
      });
      const data = await res.json();
      setNotifMsg(data.success ? "Reminder sent!" : data.error || "Failed");
    } catch {
      setNotifMsg("Network error");
    } finally {
      setSendingNotif(false);
      setTimeout(() => setNotifMsg(null), 3000);
    }
  }

  const handleRetry = () => {
    void loadCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] gap-3">
        <Loader2 className="size-6 text-white/50 animate-spin" />
        <span className="text-white/30 text-xs">Loading case file...</span>
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
          <h3 className="text-red-400 font-semibold text-[15px]">Failed to Load Case</h3>
          <p className="text-white/35 text-xs leading-relaxed max-w-[280px]">{error}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/cases"
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] text-white/70 font-medium text-xs rounded-xl transition-all"
          >
            Back to Cases
          </Link>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-white hover:bg-white/90 text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/[0.02] border border-white/[0.05] rounded-3xl gap-4 max-w-md mx-auto my-12">
        <div className="size-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/30">
          <FileText className="size-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="text-white/80 font-semibold text-[15px]">Case File Not Found</h3>
          <p className="text-white/30 text-xs leading-relaxed">This case file does not exist or has been removed.</p>
        </div>
        <Link
          href="/cases"
          className="px-4 py-2.5 bg-white hover:bg-white/90 text-black font-bold text-xs rounded-xl transition-colors"
        >
          Back to Cases
        </Link>
      </div>
    );
  }

  const eventTypeLabels: Record<string, string> = {
    status_change: "Status changed",
    hearing_updated: "Hearing date updated",
    lawyer_changed: "Lawyer reassigned",
    note_added: "Note added",
    document_uploaded: "Document uploaded",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cases" className="size-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-[20px] font-bold text-white tracking-tight font-mono">{caseData.case_number}</h1>
            <p className="text-white/35 text-sm">{CASE_TYPE_LABELS[caseData.case_type]} · {caseData.court_name || "Unknown court"}, {caseData.court_city}</p>
          </div>
        </div>
        <span className={`text-[12px] px-3 py-1.5 rounded-xl border font-semibold ${NEUTRAL_STATUS_COLORS[caseData.status]}`}>
          {CASE_STATUS_LABELS[caseData.status]}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — details + update */}
        <div className="lg:col-span-2 space-y-5">
          {/* Info card */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Case Details</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Client", value: caseData.clients?.name, icon: User },
                { label: "Phone", value: caseData.clients?.phone, icon: User },
                { label: "Court", value: caseData.court_name, icon: FileText },
                { label: "City", value: caseData.court_city, icon: FileText },
                { label: "Lawyer", value: caseData.assigned_lawyer_name, icon: User },
                { label: "Created", value: new Date(caseData.created_at).toLocaleDateString("en-IN"), icon: Calendar },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 py-2 border-b border-white/[0.05]">
                  <span className="text-white/25 w-20 shrink-0 text-[12px]">{label}</span>
                  <span className="text-white/70 font-medium text-[13px]">{value || "—"}</span>
                </div>
              ))}
            </div>
            {caseData.notes && (
              <div className="bg-white/[0.02] rounded-xl p-3 text-sm text-white/50">{caseData.notes}</div>
            )}
          </div>

          {/* Update card */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <Edit2 className="size-3.5" />
              Update Case
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs uppercase tracking-wider">Status</label>
                <select
                  id="update-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 outline-none focus:border-white/20 transition-colors"
                >
                  {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
                    <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs uppercase tracking-wider">Next Hearing Date</label>
                <input
                  id="update-hearing"
                  type="date"
                  value={newHearing}
                  onChange={(e) => setNewHearing(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white/85 outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                id="save-case-update"
                onClick={() => void handleUpdate()}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                {updating ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Save Changes
              </button>
              <button
                id="send-hearing-reminder"
                onClick={() => void sendReminder()}
                disabled={sendingNotif}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] border border-white/[0.09] text-white/60 font-medium text-sm rounded-xl hover:bg-white/[0.09] transition-colors cursor-pointer"
              >
                <Bell className="size-4" />
                {notifMsg || "Send Hearing Reminder"}
              </button>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Documents ({caseData.documents?.length || 0})</h2>
              <Link href="/documents" className="text-[11px] text-white/60 hover:text-white transition-colors">Upload →</Link>
            </div>
            {(!caseData.documents || caseData.documents.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-white/[0.01] border border-white/[0.04] border-dashed rounded-xl gap-2">
                <p className="text-white/35 text-xs">No documents uploaded to this case file yet.</p>
                <Link href="/documents" className="text-xs font-semibold text-white/60 hover:text-white transition-colors">+ Upload First Document</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {caseData.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl">
                    <FileText className="size-4 text-white/25 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-sm truncate">{doc.name}</p>
                      <p className="text-white/25 text-[11px]">{doc.doc_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString("en-IN")} · {doc.source}</p>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-white/60 hover:text-white transition-colors shrink-0"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — timeline */}
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <h2 className="text-[12px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <Clock className="size-3.5" />
              Timeline
            </h2>
            {(!caseData.case_events || caseData.case_events.length === 0) ? (
              <div className="text-center py-6">
                <p className="text-white/20 text-xs">No events logged in the case timeline.</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-white/[0.06]" />
                <div className="space-y-4 pl-8">
                  {[...caseData.case_events].reverse().map((ev) => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-5 top-1 size-2 rounded-full bg-white/20 border border-white/10" />
                      <p className="text-[12px] font-medium text-white/65">{eventTypeLabels[ev.event_type] || ev.event_type}</p>
                      {ev.old_value && ev.new_value && (
                        <p className="text-[11px] text-white/30 mt-0.5">
                          <span className="line-through">{ev.old_value}</span> → <span className="text-white/70">{ev.new_value}</span>
                        </p>
                      )}
                      {!ev.old_value && ev.new_value && (
                        <p className="text-[11px] text-white/50 mt-0.5">{ev.new_value}</p>
                      )}
                      <p className="text-[10px] text-white/20 mt-0.5">
                        {new Date(ev.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {ev.created_by_name && ` · ${ev.created_by_name}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
