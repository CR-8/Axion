"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Users, Briefcase, FolderOpen, Calendar, Bot, ArrowUpRight, AlertCircle, Sparkles, Clock, MessageSquare, Plus, CheckCircle2, ShieldAlert, ArrowRight, ShieldCheck, UserCheck, Settings } from "lucide-react";
import Link from "next/link";
import { CASE_STATUS_LABELS, type CaseStatus } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalClients: number;
  activeCases: number;
  botMessages: number;
  docsUploaded: number;
  unverifiedConvos: Array<{ id: string; phone: string; name: string | null; updated_at: string }>;
  recentCaseChanges: Array<{ id: string; case_number: string; status: CaseStatus; updated_at: string }>;
  lastMessages: Array<{
    id: string;
    content: string;
    role: "user" | "assistant";
    created_at: string;
    conversations: { name: string | null; phone: string } | null;
  }>;
  upcomingHearings: Array<{
    id: string;
    case_number: string;
    next_hearing_date: string;
    clients: { name: string } | null;
    court_name: string | null;
  }>;
  agentCount: number;
  humanCount: number;
}

const NEUTRAL_STATUS_COLORS: Record<CaseStatus, string> = {
  active: "text-foreground bg-muted border-border-default",
  hearing_scheduled: "text-text-secondary bg-surface border-border-default",
  adjourned: "text-text-secondary bg-muted/50 border-border-default/50",
  judgement_pending: "text-foreground/80 bg-surface border-border-default",
  closed: "text-text-secondary/40 bg-muted/20 border-border-default/40",
};

export default function DashboardHome() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrgId = useCallback(async () => {
    try {
      setError(null);
      const supabase = getBrowserSupabase();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;

      const { data: member, error: memberError } = await supabase
        .from("org_members")
        .select("org_id, full_name")
        .eq("user_id", user.id)
        .single();

      if (memberError) throw memberError;
      if (member?.org_id) {
        setOrgId(member.org_id);
        setUserName(member.full_name || "Counsellor");
      }
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load organization settings.");
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (oid: string) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();

      // Parallel queries to construct the Today Command Center dashboard
      const [
        clientsCount,
        casesRes,
        docsCount,
        hearingsRes,
        unverifiedRes,
        recentCasesRes,
        lastMessagesRes,
        conversationsRes
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact" }).eq("org_id", oid),
        supabase.from("cases").select("id, status").eq("org_id", oid),
        supabase.from("documents").select("id", { count: "exact" }).eq("org_id", oid),
        
        // Upcoming hearings (next 30 days)
        supabase.from("cases")
          .select("id, case_number, next_hearing_date, court_name, clients(name)")
          .eq("org_id", oid)
          .not("next_hearing_date", "is", null)
          .gte("next_hearing_date", new Date().toISOString().split("T")[0])
          .order("next_hearing_date", { ascending: true })
          .limit(5),
          
        // Unverified conversations
        supabase.from("conversations")
          .select("id, phone, name, updated_at")
          .eq("org_id", oid)
          .neq("session_state", "verified")
          .order("updated_at", { ascending: false })
          .limit(5),

        // Recently modified cases (last 48 hours)
        supabase.from("cases")
          .select("id, case_number, status, updated_at")
          .eq("org_id", oid)
          .gte("updated_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString())
          .order("updated_at", { ascending: false })
          .limit(5),
          
        // Last 5 messages feed
        supabase.from("messages")
          .select(`
            id, content, role, created_at,
            conversations!inner(name, phone, org_id)
          `)
          .eq("conversations.org_id", oid)
          .order("created_at", { ascending: false })
          .limit(5),

        // Conversations for mode statistics
        supabase.from("conversations")
          .select("id, mode")
          .eq("org_id", oid)
      ]);

      if (clientsCount.error) throw clientsCount.error;
      if (casesRes.error) throw casesRes.error;
      if (docsCount.error) throw docsCount.error;
      if (hearingsRes.error) throw hearingsRes.error;
      if (unverifiedRes.error) throw unverifiedRes.error;
      if (recentCasesRes.error) throw recentCasesRes.error;
      if (lastMessagesRes.error) throw lastMessagesRes.error;
      if (conversationsRes.error) throw conversationsRes.error;

      const convos = conversationsRes.data || [];
      const agentCount = convos.filter(c => c.mode === "agent").length;
      const humanCount = convos.filter(c => c.mode === "human").length;

      // Unpack lastMessages typed nicely
      const messagesFeed = (lastMessagesRes.data || []).map((m: any) => ({
        id: m.id,
        content: m.content,
        role: m.role as "user" | "assistant",
        created_at: m.created_at,
        conversations: m.conversations ? {
          name: m.conversations.name,
          phone: m.conversations.phone
        } : null
      }));

      // Count total messages for stat counter
      const { count: msgCount } = await supabase.from("messages")
        .select("id", { count: "exact" });

      setStats({
        totalClients: clientsCount.count || 0,
        activeCases: (casesRes.data || []).filter(c => c.status !== "closed").length,
        botMessages: msgCount || 0,
        docsUploaded: docsCount.count || 0,
        unverifiedConvos: unverifiedRes.data || [],
        recentCaseChanges: recentCasesRes.data || [],
        lastMessages: messagesFeed,
        upcomingHearings: (hearingsRes.data || []) as any,
        agentCount,
        humanCount,
      });

    } catch (e: unknown) {
      setError((e as Error).message || "An unexpected error occurred while loading dashboard statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrgId(); }, [loadOrgId]);
  useEffect(() => { if (orgId) void loadStats(orgId); }, [orgId, loadStats]);

  const currentGreeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Time format helper
  function formatMsgTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Relative Date calculation for hearings
  function getHearingLabel(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = dStart.getTime() - nStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="h-28 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-red-dim border border-red-border rounded-3xl gap-4 max-w-md mx-auto my-12">
        <div className="size-14 rounded-2xl bg-red-dim border border-red-border flex items-center justify-center text-red-text">
          <AlertCircle className="size-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="text-red-text font-semibold text-[15px]">Failed to Load Command Center</h3>
          <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">{error}</p>
        </div>
        <button
          onClick={() => void loadStats(orgId || "")}
          className="px-4 py-2 bg-foreground hover:bg-foreground/90 text-background font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* Greeting Banner */}
      <div className="rounded-2xl p-6 relative overflow-hidden bg-surface border border-border-default shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-foreground/[0.01] rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {currentGreeting}, {userName || "Counsel"}
            </h1>
            <p className="text-text-secondary/70 text-xs sm:text-sm font-medium">
              Welcome to LexBot Legal Operations Command Center.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-muted border border-border-default rounded-xl text-[11px] font-semibold text-text-secondary w-fit font-mono">
            <Clock className="size-3.5 text-text-secondary" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Grid: 3-Column Today Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Today's Agenda & Case Changes */}
        <div className="space-y-6">
          {/* Upcoming Hearings */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calendar className="size-4 text-text-secondary" />
                Hearings Agenda
              </h2>
              <span className="text-[10px] text-text-secondary bg-muted border border-border-default px-2 py-0.5 rounded font-mono font-bold">
                {stats?.upcomingHearings.length || 0} Scheduled
              </span>
            </div>

            {stats?.upcomingHearings.length === 0 ? (
              <div className="text-center py-8 bg-background/20 rounded-xl border border-dashed border-border-default/40">
                <p className="text-text-secondary/50 text-xs">No upcoming hearings scheduled.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats?.upcomingHearings.map((h) => {
                  const label = getHearingLabel(h.next_hearing_date);
                  const isToday = label === "Today";
                  
                  return (
                    <Link
                      key={h.id}
                      href={`/cases/${h.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border-default/80 bg-background/40 hover:bg-muted/30 transition-all group"
                    >
                      <div className={["shrink-0 text-center px-2 py-1 rounded-md text-[10px] font-bold border", isToday ? "bg-primary/10 border-primary/20 text-primary animate-pulse" : "bg-muted/50 border-border-default/40 text-text-secondary"].join(" ")}>
                        {label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground/80 truncate group-hover:text-foreground transition-colors font-mono">{h.case_number}</p>
                        <p className="text-[10.5px] text-text-secondary truncate">{h.clients?.name || "No Client"} · {h.court_name || "Unknown Court"}</p>
                      </div>
                      <ArrowUpRight className="size-3.5 text-text-secondary/35 group-hover:text-foreground transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cases Changed Recently */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="size-4 text-text-secondary" />
              Recent Case Changes (48h)
            </h2>

            {stats?.recentCaseChanges.length === 0 ? (
              <div className="text-center py-8 bg-background/20 rounded-xl border border-dashed border-border-default/40">
                <p className="text-text-secondary/50 text-xs">No cases updated in the last 48 hours.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats?.recentCaseChanges.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-border-default/80 bg-background/40 hover:bg-muted/30 transition-all group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground/85 font-mono truncate group-hover:text-foreground transition-colors">{c.case_number}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Updated {new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold shrink-0 ${NEUTRAL_STATUS_COLORS[c.status]}`}>
                      {CASE_STATUS_LABELS[c.status]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: Live WhatsApp Inbox & AI Stats */}
        <div className="space-y-6">
          {/* Unverified Conversations */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="size-4 text-rose-400" />
                Unverified Sessions
              </h2>
              <span className="text-[9px] px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-bold uppercase animate-pulse">
                {stats?.unverifiedConvos.length || 0} Pending
              </span>
            </div>

            {stats?.unverifiedConvos.length === 0 ? (
              <div className="text-center py-8 bg-background/20 rounded-xl border border-dashed border-border-default/40">
                <p className="text-text-secondary/50 text-xs">All active client conversations verified.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats?.unverifiedConvos.map((convo) => (
                  <Link
                    key={convo.id}
                    href={`/chat`}
                    className="flex items-center justify-between p-3 rounded-xl border border-border-default/80 bg-background/40 hover:bg-muted/30 transition-all group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground/90 group-hover:text-foreground">{convo.name || convo.phone}</p>
                      <p className="text-[10px] text-text-secondary font-mono mt-0.5 tracking-wide">{convo.phone}</p>
                    </div>
                    <ArrowRight className="size-3.5 text-text-secondary/40 group-hover:text-foreground transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Live Message Feed */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="size-4 text-text-secondary" />
              Live Messages Feed
            </h2>

            {stats?.lastMessages.length === 0 ? (
              <div className="text-center py-8 bg-background/20 rounded-xl border border-dashed border-border-default/40">
                <p className="text-text-secondary/50 text-xs">No messages logged in feed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.lastMessages.map((msg) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <Link
                      key={msg.id}
                      href={`/chat`}
                      className="block hover:bg-muted/20 p-2 rounded-lg transition-colors border border-transparent hover:border-border-default/30"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={["size-5.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5", isAssistant ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-text-secondary border border-border-default/60"].join(" ")}>
                          {isAssistant ? "AI" : (msg.conversations?.name?.[0] || "U")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-foreground/80 truncate">{isAssistant ? "AI Agent" : (msg.conversations?.name || msg.conversations?.phone)}</span>
                            <span className="text-[9px] text-text-secondary/40 shrink-0 font-mono">{formatMsgTime(msg.created_at)}</span>
                          </div>
                          <p className="text-[11.5px] text-text-secondary/85 mt-0.5 truncate leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Quick Actions, AI triage, Reminders */}
        <div className="space-y-6">
          {/* Quick Actions Shortcuts */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="size-4 text-text-secondary" />
              Command shortcuts
            </h2>
            
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { href: "/clients/new", label: "New Client", desc: "Register client", icon: Users },
                { href: "/cases/new", label: "New Case", desc: "Open docket", icon: Briefcase },
                { href: "/documents", label: "Upload Doc", desc: "Store document", icon: FolderOpen },
                { href: "/settings", label: "Settings", desc: "Meta & AI key", icon: Settings },
              ].map(({ href, label, desc, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col p-3 rounded-xl border border-border-default/80 bg-background/50 hover:bg-muted/30 transition-all group text-left"
                >
                  <Icon className="size-4 text-text-secondary/50 group-hover:text-foreground transition-colors" strokeWidth={1.8} />
                  <span className="text-[12px] font-bold text-foreground/90 mt-2 block">{label}</span>
                  <span className="text-[10px] text-text-secondary/55 mt-0.5 block">{desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* AI vs Human Stats Triage Card */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-[12px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Bot className="size-4 text-text-secondary" />
              Automation Triage
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 border border-border-default/60 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary font-semibold">
                  <ShieldCheck className="size-3.5 text-primary" />
                  AI Handled
                </div>
                <div className="text-2xl font-extrabold text-foreground mt-1.5 font-mono tabular-nums">{stats?.agentCount ?? 0}</div>
                <p className="text-[9px] text-text-secondary/50 mt-0.5">Live WhatsApp sessions</p>
              </div>

              <div className="bg-background/50 border border-border-default/60 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary font-semibold">
                  <UserCheck className="size-3.5 text-amber-400" />
                  Human Operator
                </div>
                <div className="text-2xl font-extrabold text-foreground mt-1.5 font-mono tabular-nums">{stats?.humanCount ?? 0}</div>
                <p className="text-[9px] text-text-secondary/50 mt-0.5">Lawyer takeover active</p>
              </div>
            </div>
            
            <div className="bg-muted/40 border border-border-default/40 rounded-xl p-3 text-[11px] text-text-secondary leading-relaxed">
              Active sessions: <strong className="text-foreground">{(stats?.agentCount || 0) + (stats?.humanCount || 0)}</strong>. Clients verifications: <strong className="text-foreground">{stats?.totalClients}</strong> registered. Set takeovers on the WhatsApp chat tab.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
