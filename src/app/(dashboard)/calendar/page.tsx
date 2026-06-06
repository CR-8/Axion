"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Briefcase, MapPin, User, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface HearingEvent {
  id: string;
  case_number: string;
  next_hearing_date: string;
  court_name: string | null;
  court_city: string | null;
  clients: { name: string } | null;
}

export default function CalendarPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [events, setEvents] = useState<HearingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadOrgId = useCallback(async () => {
    try {
      setError(null);
      const supabase = getBrowserSupabase();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
      if (m?.org_id) setOrgId(m.org_id);
    } catch (e: any) {
      setError(e.message || "Failed to authenticate.");
      setLoading(false);
    }
  }, []);

  const loadHearings = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases?org_id=${orgId}`);
      if (!res.ok) throw new Error(await res.text() || "Failed to load hearings.");
      const data = await res.json();
      
      // Filter cases that have a next hearing date
      const hearingEvents = data
        .filter((c: any) => c.next_hearing_date)
        .map((c: any) => ({
          id: c.id,
          case_number: c.case_number,
          next_hearing_date: c.next_hearing_date,
          court_name: c.court_name,
          court_city: c.court_city,
          clients: c.clients,
        }));
      setEvents(hearingEvents);
    } catch (e: any) {
      setError(e.message || "An error occurred fetching events.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void loadOrgId(); }, [loadOrgId]);
  useEffect(() => { if (orgId) void loadHearings(); }, [orgId, loadHearings]);

  // Helper arrays
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Month calculation helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayIndex = new Date(year, month, 1).getDay(); // 0: Sun, 1: Mon, etc.
  
  // Calculate padding cells at the start of calendar month grid
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prevMonthPadding = Array.from({ length: startDayIndex }).map((_, i) => {
    const day = prevMonthDays - startDayIndex + i + 1;
    return { day, isCurrentMonth: false, date: new Date(year, month - 1, day) };
  });

  // Current month days
  const currentMonthDays = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    return { day, isCurrentMonth: true, date: new Date(year, month, day) };
  });

  // Padding cells at the end of calendar grid to make it a perfect rectangle
  const totalGridCells = 42; // 6 rows * 7 days
  const postMonthPaddingLength = totalGridCells - (prevMonthPadding.length + currentMonthDays.length);
  const postMonthPadding = Array.from({ length: postMonthPaddingLength }).map((_, i) => {
    const day = i + 1;
    return { day, isCurrentMonth: false, date: new Date(year, month + 1, day) };
  });

  const gridCells = [...prevMonthPadding, ...currentMonthDays, ...postMonthPadding];

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, HearingEvent[]> = {};
    events.forEach(e => {
      const dateStr = new Date(e.next_hearing_date).toISOString().split("T")[0];
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(e);
      }
    });
    return map;
  }, [events]);

  // Selected date schedule
  const selectedDateStr = selectedDate.toISOString().split("T")[0] || "";
  const selectedDayEvents = eventsByDate[selectedDateStr] || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header operations */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="size-6 text-text-secondary" strokeWidth={1.5} />
            Hearing Calendar
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">Manage hearing schedules and court milestones</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleToday}
            className="px-3 py-1.5 bg-surface hover:bg-surface-elevated border border-border-default text-foreground/80 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Today
          </button>
          
          <div className="flex items-center bg-surface border border-border-default rounded-lg p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-muted text-text-secondary hover:text-foreground rounded transition-colors cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-3 text-xs font-bold text-foreground/90 font-mono min-w-32 text-center">
              {months[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-muted text-text-secondary hover:text-foreground rounded transition-colors cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* States */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-red-500/[0.02] border border-red-500/10 rounded-3xl gap-4 max-w-md mx-auto my-8">
          <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-red-400 font-semibold text-[15px]">Failed to Load Calendar</h3>
            <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">{error}</p>
          </div>
          <button
            onClick={() => void loadHearings()}
            className="px-4 py-2 bg-muted border border-border-default hover:bg-surface-elevated text-foreground font-medium text-xs rounded-xl transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Month Grid (3 columns wide) */}
          <div className="lg:col-span-3 bg-surface border border-border-default rounded-2xl overflow-hidden shadow-sm">
            {/* Day of Week Labels */}
            <div className="grid grid-cols-7 border-b border-border-default/50 bg-muted/10">
              {weekdays.map(day => (
                <div key={day} className="py-2.5 text-center text-[10.5px] font-bold text-text-secondary uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 grid-rows-6 h-[500px] bg-background/20 divide-x divide-y divide-border-default/30 border-l border-t border-transparent">
              {gridCells.map((cell, idx) => {
                const cellDateStr = cell.date.toISOString().split("T")[0] || "";
                const cellEvents = eventsByDate[cellDateStr] || [];
                const isSelected = selectedDate.toDateString() === cell.date.toDateString();
                const isToday = new Date().toDateString() === cell.date.toDateString();

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    className={[
                      "p-1.5 flex flex-col justify-between hover:bg-muted/15 transition-all cursor-pointer relative",
                      cell.isCurrentMonth ? "bg-surface" : "bg-muted/5 text-text-secondary/35",
                      isSelected ? "ring-1 ring-primary/60 bg-primary/[0.01]" : ""
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className={[
                        "text-[11px] font-bold font-mono size-5 rounded-full flex items-center justify-center tabular-nums",
                        isToday ? "bg-foreground text-background" : cell.isCurrentMonth ? "text-foreground/80" : "text-text-secondary/40"
                      ].join(" ")}>
                        {cell.day}
                      </span>
                      {cellEvents.length > 0 && (
                        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>

                    {/* Cell Events list */}
                    <div className="flex-1 overflow-y-auto mt-1 space-y-1 scrollbar-none max-h-14">
                      {cellEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className="px-1 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-medium text-foreground/90 truncate font-mono"
                        >
                          {ev.case_number}
                        </div>
                      ))}
                      {cellEvents.length > 2 && (
                        <div className="text-[8px] text-text-secondary/50 font-bold px-1">
                          +{cellEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar Panel: Selected Day Hearings (1 column wide) */}
          <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="border-b border-border-default/40 pb-3">
              <h2 className="text-[12.5px] font-bold text-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-text-secondary" />
                Selected Schedule
              </h2>
              <p className="text-[11px] text-text-secondary mt-1 font-mono">
                {selectedDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12 bg-background/25 border border-dashed border-border-default/45 rounded-xl">
                <p className="text-text-secondary/50 text-xs">No hearings scheduled on this date.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                {selectedDayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-border-default bg-background/60 hover:bg-background transition-colors space-y-2.5 relative group"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <Link 
                          href={`/cases/${ev.id}`}
                          className="text-xs font-bold text-foreground/90 hover:text-primary hover:underline font-mono truncate flex items-center gap-1"
                        >
                          {ev.case_number}
                          <Briefcase className="size-3 text-text-secondary/40 shrink-0" />
                        </Link>
                        {ev.clients && (
                          <p className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-1">
                            <User className="size-3 text-text-secondary/50" />
                            {ev.clients.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-[10.5px] text-text-secondary/85 space-y-1 border-t border-border-default/30 pt-2 font-sans">
                      {ev.court_name && (
                        <p className="flex items-center gap-1 truncate">
                          <MapPin className="size-3 text-text-secondary/40 shrink-0" />
                          {ev.court_name}
                        </p>
                      )}
                      {ev.court_city && (
                        <p className="pl-4 text-[9.5px] text-text-secondary/50">{ev.court_city}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-border-default/40 text-[10.5px] text-text-secondary/50 leading-relaxed font-sans">
              Click on any hearing card to navigate directly to its case control cockpit and perform legal operations.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
