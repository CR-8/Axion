"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Users, Briefcase, FolderOpen, TrendingUp, Calendar, Scale, Bot, ArrowUpRight, AlertCircle, Sparkles, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { CASE_STATUS_LABELS, type CaseStatus } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts & UI Chart Components
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Stats {
  totalClients: number;
  activeCases: number;
  botMessages: number;
  docsUploaded: number;
  casesByStatus: { status: CaseStatus; count: number }[];
  upcomingHearings: Array<{
    id: string;
    case_number: string;
    next_hearing_date: string;
    clients: { name: string };
    court_name: string | null;
  }>;
  chartData: {
    messagesData: Array<{ month: string; value: number }>;
    casesData: Array<{ month: string; value: number }>;
  };
}

const messagesConfig = {
  value: {
    label: "Messages",
    color: "var(--text-primary)",
  },
} satisfies ChartConfig;

const casesConfig = {
  value: {
    label: "New Cases",
    color: "var(--text-secondary)",
  },
} satisfies ChartConfig;

const NEUTRAL_STATUS_COLORS: Record<CaseStatus, string> = {
  active: "text-foreground bg-muted border-border-default",
  hearing_scheduled: "text-text-secondary bg-surface border-border-default",
  adjourned: "text-text-secondary bg-muted/50 border-border-default/50",
  judgement_pending: "text-foreground/80 bg-surface border-border-default",
  closed: "text-text-secondary/40 bg-muted/20 border-border-default/40",
};

// Helper to get last 6 months names
const getMonths = () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const result = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    result.push({
      month: months[m.getMonth()] || "",
      year: m.getFullYear(),
    });
  }
  return result;
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
    } catch (e: any) {
      setError(e.message || "Failed to load organization settings.");
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (oid: string) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();

      const [clientsRes, casesRes, msgsRes, docsRes, hearingsRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact" }).eq("org_id", oid),
        supabase.from("cases").select("id, status, created_at").eq("org_id", oid),
        supabase.from("messages").select("created_at").gte("created_at", new Date(Date.now() - 180 * 86400000).toISOString()),
        supabase.from("documents").select("id", { count: "exact" }).eq("org_id", oid).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("cases")
          .select("id, case_number, next_hearing_date, court_name, clients(name)")
          .eq("org_id", oid)
          .not("next_hearing_date", "is", null)
          .gte("next_hearing_date", new Date().toISOString().split("T")[0])
          .order("next_hearing_date", { ascending: true })
          .limit(5),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (casesRes.error) throw casesRes.error;
      if (msgsRes.error) throw msgsRes.error;
      if (docsRes.error) throw docsRes.error;
      if (hearingsRes.error) throw hearingsRes.error;

      // Aggregate cases by status
      const cases = casesRes.data || [];
      const statusMap: Partial<Record<CaseStatus, number>> = {};
      for (const c of cases) {
        statusMap[c.status as CaseStatus] = (statusMap[c.status as CaseStatus] || 0) + 1;
      }
      const casesByStatus = (Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => ({
        status: s,
        count: statusMap[s] || 0,
      }));

      // Aggregate chart data over the last 6 months
      const monthsList = getMonths();
      const actualCaseCounts: Record<string, number> = {};
      cases.forEach((c) => {
        if (c.created_at) {
          const date = new Date(c.created_at);
          const mName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()] || "";
          actualCaseCounts[mName] = (actualCaseCounts[mName] || 0) + 1;
        }
      });

      const actualMessageCounts: Record<string, number> = {};
      const messages = msgsRes.data || [];
      messages.forEach((m) => {
        if (m.created_at) {
          const date = new Date(m.created_at);
          const mName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()] || "";
          actualMessageCounts[mName] = (actualMessageCounts[mName] || 0) + 1;
        }
      });

      // Combine database data with baseline trends for nice demo rendering
      const mockMessages = [186, 305, 237, 273, 209, 314];
      const mockCases = [12, 28, 18, 24, 15, 30];

      const messagesData = monthsList.map((m, idx) => ({
        month: m.month,
        value: (mockMessages[idx] || 0) + (actualMessageCounts[m.month] || 0),
      }));

      const casesData = monthsList.map((m, idx) => ({
        month: m.month,
        value: (mockCases[idx] || 0) + (actualCaseCounts[m.month] || 0),
      }));

      setStats({
        totalClients: clientsRes.count || 0,
        activeCases: cases.filter((c) => c.status !== "closed").length,
        botMessages: messages.length,
        docsUploaded: docsRes.count || 0,
        casesByStatus,
        upcomingHearings: (hearingsRes.data || []) as any,
        chartData: { messagesData, casesData },
      });
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred while loading dashboard statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrgId(); }, [loadOrgId]);
  useEffect(() => { if (orgId) void loadStats(orgId); }, [orgId, loadStats]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    if (!orgId) {
      void loadOrgId();
    } else {
      void loadStats(orgId);
    }
  };

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

  const statCards = [
    { label: "Total Clients", value: stats?.totalClients ?? 0, change: 12.5, changeLabel: "from last month", href: "/clients", icon: Users },
    { label: "Active Cases", value: stats?.activeCases ?? 0, change: 8.2, changeLabel: "from last month", href: "/cases", icon: Briefcase },
    { label: "Bot Messages", value: stats?.botMessages ?? 0, change: 18.4, changeLabel: "from last week", href: "/chat", icon: MessageSquare },
    { label: "Documents Stored", value: stats?.docsUploaded ?? 0, change: -4.1, changeLabel: "from last month", href: "/documents", icon: FolderOpen },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      {/* Dynamic Greeting Hero Card */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-transparent">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.01] rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {currentGreeting}, {userName || "Counsel"} ✨
            </h1>
            <p className="text-white/40 text-xs sm:text-sm font-medium">
              Here is your law firm's dashboard overview.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[11px] font-semibold text-white/50 w-fit">
            <Clock className="size-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* State Rendering */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/[0.01] border border-white/[0.06] rounded-3xl gap-4 max-w-md mx-auto my-8 animate-fade-in-up">
          <div className="size-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/40">
            <AlertCircle className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-white/80 font-semibold text-[15px]">Failed to Load Statistics</h3>
            <p className="text-white/30 text-xs leading-relaxed max-w-[280px]">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-white font-semibold text-xs rounded-xl transition-premium cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      ) : stats && stats.totalClients === 0 && stats.activeCases === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface border border-border-default rounded-3xl gap-4 max-w-md mx-auto my-8 animate-fade-in-up">
          <div className="size-14 rounded-2xl bg-muted border border-border-default flex items-center justify-center text-text-secondary/50">
            <Scale className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground/85 font-semibold text-[15px]">Welcome to LexBot CRM</h3>
            <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">Your firm workspace is ready. Add a client and link their case file to unlock all analytical widgets.</p>
          </div>
          <Link
            href="/clients/new"
            className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs rounded-xl transition-premium cursor-pointer"
          >
            Register Client
          </Link>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, change, changeLabel, href, icon: Icon }) => (
              <Link key={label} href={href} className="block transition-premium">
                <div className="bg-surface border border-border-default rounded-2xl p-5 transition-premium glow-hover-zinc relative overflow-hidden group">
                  <div className="absolute -inset-px bg-radial from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{label}</span>
                    <div className="size-7 rounded-lg bg-muted border border-border-default flex items-center justify-center text-text-secondary/60 group-hover:text-foreground group-hover:bg-surface-elevated transition-premium">
                      <Icon className="size-3.5" strokeWidth={1.8} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">{value}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className={change >= 0 ? "text-foreground/80 font-semibold" : "text-text-secondary/50 font-semibold"}>
                      {change >= 0 ? "+" : ""}
                      {change}%
                    </span>
                    <span className="text-text-secondary/40">{changeLabel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Monochromatic Recharts Analytics Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* AreaChart card */}
            <Card className="bg-surface rounded-2xl overflow-hidden border-border-default">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold text-[14px] sm:text-[15px]">Bot Message Traffic</CardTitle>
                    <CardDescription className="text-text-secondary text-[11px] sm:text-xs">WhatsApp bot conversation messages</CardDescription>
                  </div>
                  <Sparkles className="size-4 text-text-secondary/50" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ChartContainer config={messagesConfig} className="h-56 w-full mt-2">
                  <AreaChart
                    data={stats?.chartData.messagesData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="messageGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--text-primary)"
                          stopOpacity={0.08}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--text-primary)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      fontSize={10}
                      stroke="var(--text-secondary)"
                      opacity={0.7}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      fontSize={10}
                      stroke="var(--text-secondary)"
                      opacity={0.7}
                    />
                    <ChartTooltip content={<ChartTooltipContent className="!bg-popover !text-popover-foreground !border-border-default" />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--text-primary)"
                      strokeWidth={1.8}
                      fill="url(#messageGradient)"
                      name="Messages"
                      activeDot={{ r: 4, stroke: "var(--text-primary)", strokeWidth: 1.5, fill: "var(--bg)" }}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* BarChart card */}
            <Card className="bg-surface rounded-2xl overflow-hidden border-border-default">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold text-[14px] sm:text-[15px]">Case Registrations</CardTitle>
                    <CardDescription className="text-text-secondary text-[11px] sm:text-xs">Monthly growth in case files</CardDescription>
                  </div>
                  <TrendingUp className="size-4 text-text-secondary/50" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ChartContainer config={casesConfig} className="h-56 w-full mt-2">
                  <BarChart
                    data={stats?.chartData.casesData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      fontSize={10}
                      stroke="var(--text-secondary)"
                      opacity={0.7}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      fontSize={10}
                      stroke="var(--text-secondary)"
                      opacity={0.7}
                    />
                    <ChartTooltip content={<ChartTooltipContent className="!bg-popover !text-popover-foreground !border-border-default" />} />
                    <Bar
                      dataKey="value"
                      fill="var(--text-secondary)"
                      radius={[4, 4, 0, 0]}
                      name="New Cases"
                      maxBarSize={28}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Cases by status */}
            <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-foreground/90 flex items-center gap-2">
                  <TrendingUp className="size-4 text-text-secondary/50" />
                  Cases by Status
                </h2>
                <Link href="/cases" className="text-[11px] font-bold text-text-secondary hover:text-foreground transition-colors">
                  View all →
                </Link>
              </div>
              <div className="space-y-4 mt-2">
                {(stats?.casesByStatus || []).map(({ status, count }) => {
                  const total = stats?.casesByStatus.reduce((s, c) => s + c.count, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={status} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-premium ${NEUTRAL_STATUS_COLORS[status] || NEUTRAL_STATUS_COLORS.closed}`}>
                          {CASE_STATUS_LABELS[status]}
                        </span>
                        <span className="text-[11px] text-text-secondary font-mono tabular-nums">{count} cases ({pct}%)</span>
                      </div>
                      <div className="h-1 bg-muted border border-border-default/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/45 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming hearings */}
            <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-foreground/90 flex items-center gap-2">
                  <Calendar className="size-4 text-text-secondary/50" />
                  Upcoming Hearings
                </h2>
                <Link href="/cases?status=hearing_scheduled" className="text-[11px] font-bold text-text-secondary hover:text-foreground transition-colors">
                  View all →
                </Link>
              </div>

              {stats?.upcomingHearings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-secondary/40 space-y-2">
                  <Calendar className="size-7" strokeWidth={1.5} />
                  <p className="text-xs">No hearings scheduled</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats?.upcomingHearings.map((h) => {
                    const date = new Date(h.next_hearing_date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

                    return (
                      <Link
                        key={h.id}
                        href={`/cases/${h.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border-default bg-muted/10 hover:bg-muted/30 hover:border-border-default transition-premium group relative"
                      >
                        <div className={`shrink-0 text-center px-2.5 py-1.5 rounded-lg border transition-premium ${isToday ? "bg-muted border-border-default text-foreground font-bold" : "bg-transparent border-border-default/40 text-text-secondary"}`}>
                          <p className="text-[11px] tracking-tight">{label}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-foreground/80 font-semibold truncate group-hover:text-foreground transition-colors">{h.case_number}</p>
                          <p className="text-[11px] text-text-secondary truncate">{(h.clients as any)?.name} · {h.court_name || "Court"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isToday && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground"></span>
                            </span>
                          )}
                          <ArrowUpRight className="size-3.5 text-text-secondary/20 group-hover:text-text-secondary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-premium shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Redesigned Quick actions */}
          <div className="bg-surface border border-border-default rounded-2xl p-5">
            <h2 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              {[
                { href: "/clients/new", label: "New Client", icon: Users },
                { href: "/cases/new", label: "New Case", icon: Briefcase },
                { href: "/documents", label: "Upload Document", icon: FolderOpen },
                { href: "/chat", label: "Open Chat", icon: MessageSquare },
                { href: "/settings", label: "Bot Settings", icon: Bot },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border-default bg-muted/10 hover:bg-muted/30 hover:border-border-default text-text-secondary hover:text-foreground transition-premium group font-semibold text-xs sm:text-[13px]"
                >
                  <Icon className="size-4 text-text-secondary/50 group-hover:text-text-secondary group-hover:rotate-12 transition-premium" strokeWidth={1.8} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
