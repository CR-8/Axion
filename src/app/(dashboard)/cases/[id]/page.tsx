"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, User, FileText, Clock, Loader2, CheckCircle2, AlertCircle, Edit2, Bell, Copy, Check, ExternalLink, ShieldCheck, MessageSquare, Plus, FileCode } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
  active: "text-foreground bg-muted border-border-default",
  hearing_scheduled: "text-text-secondary bg-surface border-border-default",
  adjourned: "text-text-secondary bg-muted/50 border-border-default/50",
  judgement_pending: "text-foreground/80 bg-surface border-border-default",
  closed: "text-text-secondary/40 bg-muted/20 border-border-default/40",
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cockpit Action State
  const [newStatus, setNewStatus] = useState<CaseStatus | "">("");
  const [newHearing, setNewHearing] = useState("");
  const [newLawyer, setNewLawyer] = useState("");
  
  // Custom Timeline Note State
  const [timelineNote, setTimelineNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Notification State
  const [sendingNotif, setSendingNotif] = useState(false);

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
      setNewLawyer(data.assigned_lawyer_name || "");
    } catch (e: unknown) {
      setError((e as Error).message || "An unexpected error occurred while loading case details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadCase(); }, [loadCase]);

  // Copy Case ID to Clipboard
  function copyCaseNumber() {
    if (!caseData) return;
    navigator.clipboard.writeText(caseData.case_number);
    setCopied(true);
    toast.success("Case Number copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  // Update Case Details
  async function handleUpdate() {
    if (!caseData) return;
    setUpdating(true);
    try {
      const updates: Record<string, string> = {};
      if (newStatus && newStatus !== caseData.status) updates.status = newStatus;
      if (newHearing !== (caseData.next_hearing_date || "")) updates.next_hearing_date = newHearing;
      if (newLawyer !== (caseData.assigned_lawyer_name || "")) updates.assigned_lawyer_name = newLawyer;

      if (Object.keys(updates).length === 0) {
        setUpdating(false);
        return;
      }

      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to save updates.");
      
      toast.success("Case file updated successfully.");
      await loadCase();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to update case.");
    } finally {
      setUpdating(false);
    }
  }

  // Add Timeline Note
  async function handleAddNote() {
    if (!caseData || !timelineNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_text: timelineNote.trim()
        }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to post timeline note.");
      
      toast.success("Timeline note registered.");
      setTimelineNote("");
      await loadCase();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to save timeline note.");
    } finally {
      setAddingNote(false);
    }
  }

  // Send WhatsApp Reminder
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
      if (data.success) {
        toast.success("Hearing reminder sent on WhatsApp!");
      } else {
        toast.error(data.error || "Failed to deliver WhatsApp reminder.");
      }
    } catch {
      toast.error("Network error sending notification.");
    } finally {
      setSendingNotif(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] gap-3">
        <Loader2 className="size-6 text-text-secondary animate-spin" />
        <span className="text-text-secondary text-xs">Loading case file...</span>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-red-500/[0.02] border border-red-500/10 rounded-3xl gap-4 max-w-md mx-auto my-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="size-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="text-red-400 font-semibold text-[15px]">{error ? "Failed to Load Case" : "Case File Not Found"}</h3>
          <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">
            {error || "This case record does not exist or has been deleted."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/cases"
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] text-white/70 font-medium text-xs rounded-xl transition-all"
          >
            Back to Cases
          </Link>
          <button
            onClick={() => void loadCase()}
            className="px-4 py-2 bg-white hover:bg-white/90 text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const eventTypeLabels: Record<string, string> = {
    status_change: "Status changed",
    hearing_updated: "Hearing date updated",
    lawyer_changed: "Lawyer reassigned",
    note_added: "Lawyer Note added",
    document_uploaded: "Document uploaded",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <Link href="/cases" className="size-8 rounded-xl flex items-center justify-center bg-surface border border-border-default text-text-secondary hover:text-foreground transition-colors shadow-2xs">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <span className="text-[11px] text-text-secondary uppercase tracking-widest font-semibold">Case Operations</span>
          <h1 className="text-lg font-bold text-foreground -mt-0.5">Case Control Cockpit</h1>
        </div>
      </div>

      {/* 3-Panel Grid Cockpit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL 1: Left Summary Info (260px Equivalent) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Main Case Info Card */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] px-2.5 py-0.5 rounded border font-semibold ${NEUTRAL_STATUS_COLORS[caseData.status]}`}>
                {CASE_STATUS_LABELS[caseData.status]}
              </span>
              <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                {CASE_TYPE_LABELS[caseData.case_type]}
              </span>
            </div>

            <div>
              <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Case Number</label>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[17px] font-bold text-foreground font-mono select-all tracking-wide tabular-nums">{caseData.case_number}</span>
                <button
                  onClick={copyCaseNumber}
                  title="Copy Case Number"
                  aria-label="Copy Case ID"
                  className="size-7 rounded-lg flex items-center justify-center text-text-secondary/60 hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="border-t border-border-default/40 pt-4 space-y-3.5 text-xs">
              <div>
                <span className="text-text-secondary block font-medium">Court Detail</span>
                <span className="text-foreground/90 font-medium mt-0.5 block">{caseData.court_name || "—"}</span>
                <span className="text-[10px] text-text-secondary/70 mt-0.5 block">{caseData.court_city || "Unknown City"}</span>
              </div>

              <div>
                <span className="text-text-secondary block font-medium">Assigned Attorney</span>
                <span className="text-foreground/90 font-medium mt-0.5 block">{caseData.assigned_lawyer_name || "—"}</span>
              </div>

              <div>
                <span className="text-text-secondary block font-medium">Date Registered</span>
                <span className="text-foreground/90 font-medium mt-0.5 block font-mono text-[11px] tabular-nums">
                  {new Date(caseData.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Client Profile Card */}
          {caseData.clients && (
            <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4.5 shadow-sm">
              <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-3.5 text-text-secondary/70" />
                Client Profile
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-text-secondary block">Client Name</span>
                  <Link href={`/clients/${caseData.clients.id}`} className="text-foreground font-semibold hover:text-primary hover:underline transition-colors mt-0.5 block flex items-center gap-1">
                    {caseData.clients.name}
                    <ExternalLink className="size-3 opacity-60" />
                  </Link>
                </div>

                <div>
                  <span className="text-text-secondary block">WhatsApp Phone</span>
                  <span className="text-foreground/80 font-mono mt-0.5 block font-bold tabular-nums">{caseData.clients.phone}</span>
                </div>

                <div>
                  <span className="text-text-secondary block">Preferred Language</span>
                  <span className="text-foreground/85 uppercase font-bold text-[10px] mt-0.5 block bg-muted border border-border-default px-1.5 py-0.5 rounded w-fit">{caseData.clients.preferred_language}</span>
                </div>

                <div className="pt-2 border-t border-border-default/40">
                  <Link
                    href={`/chat`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-surface-elevated text-foreground/85 hover:text-foreground text-[11.5px] font-semibold rounded-xl border border-border-default transition-all text-center w-full cursor-pointer"
                  >
                    <MessageSquare className="size-3.5" />
                    Open WhatsApp Chat
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL 2: Center Cockpit (flex-1 Equivalent) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Note Logger Widget */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-3.5 shadow-sm">
            <h2 className="text-[11.5px] font-bold text-foreground uppercase tracking-wide">Add Internal Case Note</h2>
            <div className="space-y-2.5">
              <textarea
                value={timelineNote}
                onChange={(e) => setTimelineNote(e.target.value)}
                placeholder="Log hearing details, client updates, or case discussions in the audit timeline…"
                rows={3}
                className="w-full bg-background border border-border-default rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors resize-none leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => void handleAddNote()}
                  disabled={addingNote || !timelineNote.trim()}
                  className="px-4 py-2 bg-foreground hover:bg-foreground/90 disabled:opacity-40 text-background font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {addingNote && <Loader2 className="size-3 animate-spin" />}
                  Save to Timeline
                </button>
              </div>
            </div>
          </div>

          {/* Timeline & Audit Logs */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[11.5px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="size-4 text-text-secondary" />
              Case Audit Timeline
            </h2>

            {(!caseData.case_events || caseData.case_events.length === 0) ? (
              <div className="text-center py-8 bg-background/20 rounded-xl border border-dashed border-border-default/40">
                <p className="text-text-secondary/50 text-xs">No audit timeline records logged yet.</p>
              </div>
            ) : (
              <div className="relative pt-1.5">
                <div className="absolute left-3.5 top-3.5 bottom-3.5 w-0.5 bg-border-default/30" />
                <div className="space-y-5 pl-8">
                  {[...caseData.case_events].reverse().map((ev) => (
                    <div key={ev.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[27.5px] top-1 size-3 rounded-full bg-background border border-border-default/80 flex items-center justify-center">
                        <div className="size-1.5 rounded-full bg-primary" />
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground/95">{eventTypeLabels[ev.event_type] || ev.event_type}</p>
                        <span className="text-[10px] text-text-secondary/45 font-mono tabular-nums">
                          {new Date(ev.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>

                      {ev.event_type === "note_added" && ev.new_value && (
                        <div className="bg-background/60 border border-border-default/30 rounded-xl p-3 text-xs text-foreground/85 leading-relaxed font-sans mt-2 shadow-2xs italic">
                          "{ev.new_value}"
                        </div>
                      )}

                      {ev.event_type !== "note_added" && ev.old_value && ev.new_value && (
                        <p className="text-[11px] text-text-secondary/70 mt-1">
                          <span className="line-through">{ev.old_value}</span> &rarr; <span className="text-foreground font-medium">{ev.new_value}</span>
                        </p>
                      )}

                      {ev.event_type !== "note_added" && !ev.old_value && ev.new_value && (
                        <p className="text-[11px] text-text-secondary/70 mt-1 font-medium">{ev.new_value}</p>
                      )}

                      <p className="text-[9.5px] text-text-secondary/40 mt-1 flex items-center gap-1.5">
                        <span>{new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {ev.created_by_name && <span>· logged by {ev.created_by_name}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Document Section */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[11.5px] font-bold text-foreground uppercase tracking-wide">Case Documents ({caseData.documents?.length || 0})</h2>
              <Link
                href={{ pathname: "/documents", query: { case_id: caseData.id } }}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="size-3.5" />
                Upload Doc
              </Link>
            </div>
            
            {(!caseData.documents || caseData.documents.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-background/25 border border-dashed border-border-default/45 rounded-xl gap-2">
                <p className="text-text-secondary/45 text-xs">No documents uploaded to this case file yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {caseData.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-background border border-border-default rounded-xl hover:border-foreground/10 transition-colors">
                    <FileText className="size-4 text-text-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/90 font-medium text-xs truncate">{doc.name}</p>
                      <p className="text-text-secondary/50 text-[10px] mt-0.5">{doc.doc_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <a
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10.5px] font-semibold text-primary hover:underline shrink-0"
                    >
                      Open
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL 3: Right Control Panel (240px Equivalent) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Operations Panel Card */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[11.5px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Edit2 className="size-3.5 text-text-secondary" />
              Actions
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="cockpit-status" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider block">Case Status</label>
                <select
                  id="cockpit-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
                  className="w-full bg-background border border-border-default rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors cursor-pointer"
                >
                  {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
                    <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cockpit-hearing" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider block">Next Hearing Date</label>
                <input
                  id="cockpit-hearing"
                  type="date"
                  value={newHearing}
                  onChange={(e) => setNewHearing(e.target.value)}
                  className="w-full bg-background border border-border-default rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cockpit-lawyer" className="text-text-secondary text-[10px] font-bold uppercase tracking-wider block">Assigned Lawyer</label>
                <input
                  id="cockpit-lawyer"
                  type="text"
                  value={newLawyer}
                  onChange={(e) => setNewLawyer(e.target.value)}
                  placeholder="Attorney Name"
                  className="w-full bg-background border border-border-default rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
                />
              </div>

              <button
                onClick={() => void handleUpdate()}
                disabled={updating}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {updating ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Apply Updates
              </button>
            </div>
          </div>

          {/* Quick Notify Client */}
          {caseData.clients && (
            <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4.5 shadow-sm">
              <h2 className="text-[11.5px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Bell className="size-3.5 text-text-secondary" />
                WhatsApp Alerts
              </h2>
              
              <div className="space-y-3.5">
                <p className="text-[11px] text-text-secondary/70 leading-relaxed">
                  Deliver a quick WhatsApp hearing alert message containing the registered court date directly to client's chat.
                </p>

                <button
                  onClick={() => void sendReminder()}
                  disabled={sendingNotif || !caseData.next_hearing_date}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {sendingNotif ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
                  Notify Hearing Date
                </button>
                
                {!caseData.next_hearing_date && (
                  <p className="text-[10px] text-rose-400 text-center">
                    Set a hearing date first to send reminder.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
