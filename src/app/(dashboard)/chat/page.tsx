"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bot, User, Send, Search, Loader2, MessageSquare,
  Sparkles, AlertCircle, ChevronRight, PanelLeftClose,
  PanelLeftOpen, Zap, Clock, ShieldCheck,
} from "lucide-react";
import type { ConversationWithLastMessage, Message } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return formatTime(dateStr);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string | null, phone: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0]![0]! + parts[1]![0]!).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

const PALETTES = [
  { bg: "bg-zinc-800", ring: "ring-zinc-700/50", text: "text-zinc-200" },
  { bg: "bg-zinc-900", ring: "ring-zinc-800/50", text: "text-zinc-300" },
  { bg: "bg-white/5", ring: "ring-white/10", text: "text-white" },
  { bg: "bg-zinc-700", ring: "ring-zinc-600/50", text: "text-zinc-100" },
  { bg: "bg-zinc-950", ring: "ring-zinc-900/50", text: "text-zinc-400" },
  { bg: "bg-white/10", ring: "ring-white/20", text: "text-white/90" },
] as const;

function getPalette(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return PALETTES[Math.abs(h) % PALETTES.length]!;
}

function Avatar({ name, phone, seed, size = "md", ring = false }: {
  name: string | null; phone: string; seed: string; size?: "sm" | "md" | "lg"; ring?: boolean;
}) {
  const p = getPalette(seed);
  const sz = { sm: "size-7 text-[10px]", md: "size-9 text-xs", lg: "size-10 text-sm" }[size];
  return (
    <div className={[sz, "rounded-full flex items-center justify-center font-semibold shrink-0 tracking-wide", p.bg, p.text, ring ? `ring-1 ${p.ring}` : ""].join(" ")}>
      {getInitials(name, phone)}
    </div>
  );
}

function ModeBadge({ mode, compact = false }: { mode: string; compact?: boolean }) {
  const isAgent = mode === "agent";
  return (
    <span className={["inline-flex items-center gap-1 font-semibold uppercase tracking-widest rounded", compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1", isAgent ? "bg-white/5 text-white border border-white/10" : "bg-white/10 text-white/90 border border-white/20"].join(" ")}>
      {isAgent ? <Zap className="size-2.5" /> : <User className="size-2.5" />}
      {isAgent ? "AI" : "You"}
    </span>
  );
}

export default function ChatPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [conversations, selectedId]);
  const filteredConvos = useMemo(() => {
    const q = search.toLowerCase();
    return conversations.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) || c.phone.includes(q) || (c.last_message ?? "").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    for (const msg of messages) {
      const label = new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
      const last = groups[groups.length - 1];
      if (last?.date === label) last.msgs.push(msg);
      else groups.push({ date: label, msgs: [msg] });
    }
    return groups;
  }, [messages]);

  const agentCount = useMemo(() => conversations.filter((c) => c.mode === "agent").length, [conversations]);
  const humanCount = useMemo(() => conversations.filter((c) => c.mode === "human").length, [conversations]);
  const verifiedCount = useMemo(() => conversations.filter((c) => c.session_state === "verified").length, [conversations]);

  async function readJson<T>(res: Response): Promise<T> {
    const body = await res.text();
    if (!res.ok) throw new Error(body || `HTTP ${res.status}`);
    return body ? (JSON.parse(body) as T) : ([] as unknown as T);
  }

  const fetchConversations = useCallback(async () => {
    setSidebarLoading(true);
    setSidebarError(null);
    try {
      const data = await readJson<ConversationWithLastMessage[]>(await fetch("/api/conversations"));
      setConversations(data);
      setBackendNotice(null);
    } catch (e: unknown) {
      setConversations([]);
      setSidebarError((e as Error).message || "Failed to load active chats.");
      setBackendNotice("Backend unavailable — messages are disabled.");
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const data = await readJson<Message[]>(await fetch(`/api/conversations/${id}/messages`));
      setMessages(data);
      setBackendNotice(null);
    } catch (e: unknown) {
      setMessages([]);
      setMessagesError((e as Error).message || "Failed to load message history.");
      setBackendNotice("Backend unavailable — messages are disabled.");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => { void fetchConversations(); }, [fetchConversations]);
  useEffect(() => { if (selectedId) void fetchMessages(selectedId); }, [selectedId, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    if (!supabase) return;
    const ch = supabase.channel("rt-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const m = p.new as Message;
        if (m.conversation_id === selectedId)
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        void fetchConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => void fetchConversations())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [selectedId, fetchConversations, supabase]);

  async function toggleMode() {
    if (!selected) return;
    const newMode = selected.mode === "agent" ? "human" : "agent";
    try {
      await fetch(`/api/conversations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, mode: newMode } : c));
    } catch {
      alert("Failed to toggle mode.");
    }
  }

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      await fetch(`/api/conversations/${selectedId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      setInput("");
      void fetchMessages(selectedId);
    } catch {
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full overflow-hidden text-foreground text-sm">
      {/* Sidebar */}
      <aside className={["flex flex-col shrink-0 bg-surface border-r border-border-default transition-all duration-300 ease-in-out overflow-hidden", sidebarOpen ? "w-72 min-w-72" : "w-0 min-w-0"].join(" ")}>
        <div className="w-72 flex flex-col h-full">
          <div className="px-4 pt-4 pb-3 border-b border-border-default space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-muted border border-border-default flex items-center justify-center text-foreground">
                <Bot className="size-4" strokeWidth={1.8} />
              </div>
              <div>
                <p className="font-semibold text-[13px] text-foreground/90">WhatsApp Bot</p>
                <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <span className="size-1.5 rounded-full bg-foreground shadow-[0_0_6px_var(--border)] animate-pulse" />
                  Live · {conversations.length} active
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "AI", value: agentCount, cls: "text-foreground/90 bg-muted border-border-default/50" },
                { label: "Human", value: humanCount, cls: "text-foreground/80 bg-muted/60 border-border-default/50" },
                { label: "Verified", value: verifiedCount, cls: "text-foreground bg-muted border-border-default" },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`rounded-xl border px-2 py-2 text-center ${cls}`}>
                  <p className="text-[18px] font-semibold tabular-nums leading-none">{value}</p>
                  <p className="text-[9px] mt-1 opacity-60">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-3 pt-3 pb-1.5">
            <label className="flex items-center gap-2.5 bg-surface-elevated border border-border-default rounded-xl px-3 py-2">
              <Search className="size-3.5 text-text-secondary/50 shrink-0" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-foreground/90 placeholder:text-text-secondary/60" />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
            {sidebarError ? (
              <div className="flex flex-col items-center justify-center gap-2.5 py-12 px-4 text-center">
                <AlertCircle className="size-5 text-red-400/80" />
                <p className="text-xs text-text-secondary">{sidebarError}</p>
                <button
                  onClick={() => void fetchConversations()}
                  className="px-2.5 py-1 border border-border-default hover:bg-muted text-foreground font-medium text-[11px] rounded-lg transition-all cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : sidebarLoading ? (
              <div className="space-y-2 p-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                    <Skeleton className="size-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2.5 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-text-secondary/40">
                <MessageSquare className="size-6" strokeWidth={1.4} />
                <p className="text-xs">{search ? "No results" : "No conversations yet"}</p>
              </div>
            ) : (
              <div className="space-y-px">
                {filteredConvos.map((convo) => {
                  const isSelected = selectedId === convo.id;
                  return (
                    <button key={convo.id} onClick={() => setSelectedId(convo.id)}
                      className={["relative w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all duration-100 cursor-pointer", isSelected ? "bg-muted/70 ring-1 ring-border-default" : "hover:bg-muted/30"].join(" ")}>
                      {isSelected && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-foreground rounded-r-full" />}
                      <Avatar name={convo.name} phone={convo.phone} seed={convo.id} ring={isSelected} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`truncate text-[13px] font-medium ${isSelected ? "text-foreground" : "text-foreground/85"}`}>{convo.name || convo.phone}</span>
                          <span className="shrink-0 text-[10px] text-text-secondary/50 flex items-center gap-1">
                            <Clock className="size-2.5" />
                            {formatDate(convo.updated_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] text-text-secondary/60 flex-1">{convo.last_message ?? "No messages yet"}</p>
                          <div className="flex items-center gap-1">
                            {convo.session_state === "verified" && <ShieldCheck className="size-3 text-foreground/50" />}
                            <ModeBadge mode={convo.mode} compact />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
        {backendNotice && (
          <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-300 shrink-0">
            <AlertCircle className="size-3.5 shrink-0" />
            {backendNotice}
          </div>
        )}

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-secondary/40">
            <div className="size-16 rounded-2xl bg-muted border border-border-default flex items-center justify-center">
              <MessageSquare className="size-7" strokeWidth={1.4} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[14px] font-medium text-text-secondary/70">Select a conversation</p>
              <p className="text-xs">Choose one from the sidebar to view messages</p>
            </div>
          </div>
        ) : (
          <>
            <header className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border-default bg-surface">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSidebarOpen((v) => !v)} className="size-8 rounded-lg bg-muted border border-border-default flex items-center justify-center text-text-secondary/50 hover:text-foreground hover:bg-muted transition-all cursor-pointer">
                  {sidebarOpen ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-3.5" />}
                </button>
                <Avatar name={selected.name} phone={selected.phone} seed={selected.id} size="md" ring />
                <div className="min-w-0">
                  <p className="font-semibold text-[14px] text-foreground/90 truncate">{selected.name || selected.phone}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-text-secondary/70 font-mono truncate">{selected.phone}</p>
                    {selected.session_state === "verified" && (
                      <span className="flex items-center gap-1 text-[10px] text-foreground/90 bg-muted border border-border-default px-1.5 py-0.5 rounded">
                        <ShieldCheck className="size-2.5" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => void toggleMode()} className={["flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-medium border transition-all shrink-0 cursor-pointer", selected.mode === "agent" ? "bg-muted border-border-default text-foreground hover:bg-surface-elevated" : "bg-primary border-transparent text-primary-foreground hover:opacity-90"].join(" ")}>
                {selected.mode === "agent" ? <Bot className="size-3.5" strokeWidth={1.8} /> : <User className="size-3.5" />}
                {selected.mode === "agent" ? "AI Mode" : "Human Mode"}
                <ChevronRight className="size-3 opacity-40" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
              {messagesError ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-12">
                  <AlertCircle className="size-8 text-red-400" />
                  <p className="text-sm text-text-secondary">{messagesError}</p>
                  <button
                    onClick={() => void fetchMessages(selected.id)}
                    className="px-3 py-1.5 bg-muted border border-border-default hover:bg-surface-elevated text-foreground/80 font-medium text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : messagesLoading ? (
                <div className="h-full flex flex-col justify-end gap-4 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`flex gap-3 items-end ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                      {i % 2 === 0 && <Skeleton className="size-7 rounded-full" />}
                      <div className="space-y-1.5">
                        <Skeleton className={`h-9 w-48 rounded-xl ${i % 2 === 0 ? "rounded-bl-none" : "rounded-br-none"}`} />
                        <Skeleton className="h-2 w-12" />
                      </div>
                      {i % 2 !== 0 && <Skeleton className="size-7 rounded-full" />}
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-text-secondary/40 text-center">
                  <MessageSquare className="size-8" strokeWidth={1.4} />
                  <p className="text-xs">No message logs exist for this contact.</p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-border-default/50" />
                      <span className="text-[10px] uppercase tracking-[0.07em] font-medium text-text-secondary/50 px-2">{group.date}</span>
                      <div className="flex-1 h-px bg-border-default/50" />
                    </div>
                    <div className="space-y-0.5">
                      {group.msgs.map((msg, i) => {
                        const isUser = msg.role === "user";
                        const prevSame = i > 0 && group.msgs[i - 1]?.role === msg.role;
                        const nextSame = group.msgs[i + 1]?.role === msg.role;
                        const isLast = !nextSame;
                        const userRadius = [prevSame ? "rounded-tl" : "rounded-tl-2xl", "rounded-tr-2xl", "rounded-br-2xl", nextSame ? "rounded-bl" : "rounded-bl-2xl"].join(" ");
                        const aiRadius = ["rounded-tl-2xl", prevSame ? "rounded-tr" : "rounded-tr-2xl", nextSame ? "rounded-br" : "rounded-br-2xl", "rounded-bl-2xl"].join(" ");
                        return (
                          <div key={msg.id} className={["flex items-end gap-2", isUser ? "justify-start" : "justify-end", isLast ? "mb-3" : "mb-0.5"].join(" ")}>
                            {isUser && <div className={isLast ? "visible shrink-0" : "invisible shrink-0 pointer-events-none"}><Avatar name={selected.name} phone={selected.phone} seed={selected.id} size="sm" /></div>}
                            <div className={`flex flex-col max-w-[66%] ${isUser ? "items-start" : "items-end"}`}>
                              <div className={["px-3.5 py-2.5 text-[13.5px] leading-relaxed", isUser ? `bg-muted text-foreground/95 border border-border-default ${userRadius}` : `bg-primary text-primary-foreground font-medium ${aiRadius}`].join(" ")}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              </div>
                              {isLast && (
                                <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[10px] text-text-secondary/50">
                                  {!isUser && <span className="flex items-center gap-1 text-text-secondary/70"><Sparkles className="size-2.5" />AI ·</span>}
                                  {formatTime(msg.created_at)}
                                </div>
                              )}
                            </div>
                            {!isUser && <div className={isLast ? "visible shrink-0" : "invisible shrink-0 pointer-events-none"}><div className="size-7 rounded-full bg-muted border border-border-default flex items-center justify-center text-foreground"><Bot className="size-3.5" strokeWidth={1.8} /></div></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}

        <div className="shrink-0 border-t border-border-default bg-surface px-4 pt-3 pb-4">
          <div className="flex items-end gap-3 bg-surface-elevated border border-border-default rounded-2xl px-4 py-3 focus-within:border-foreground/20 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
              placeholder={selected ? "Type a message… (↵ send · ⇧↵ newline)" : "Select a conversation to start messaging"}
              disabled={!selected || messagesLoading}
              rows={1}
              className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-foreground placeholder:text-text-secondary/50 resize-none leading-relaxed disabled:opacity-40"
            />
            <button onClick={() => void handleSend()} disabled={sending || !selectedId || !input.trim() || messagesLoading}
              className={["size-8 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer", input.trim() && selectedId && !messagesLoading ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-muted text-text-secondary/45 cursor-not-allowed", sending ? "opacity-50" : ""].join(" ")}>
              {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-text-secondary/40">
            {selected ? `Replying as ${selected.mode === "agent" ? "AI Agent" : "Human Operator"} · Enter to send` : "No conversation selected"}
          </p>
        </div>
      </div>
    </div>
  );
}
