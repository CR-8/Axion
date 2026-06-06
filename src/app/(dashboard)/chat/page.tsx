"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bot, User, Send, Loader2, MessageSquare,
  Sparkles, AlertCircle, ChevronRight,
  ShieldCheck, CheckCheck, ArrowLeft,
  Globe,
} from "lucide-react";
import type { ConversationWithLastMessage, Message } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useChatStore, selectConversation, setChatState } from "@/lib/chat-store";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

const AVATAR_BG = [
  "from-blue-500/20 to-blue-600/20 text-blue-600 dark:text-blue-400",
  "from-emerald-500/20 to-emerald-600/20 text-emerald-600 dark:text-emerald-400",
  "from-violet-500/20 to-violet-600/20 text-violet-600 dark:text-violet-400",
  "from-amber-500/20 to-amber-600/20 text-amber-600 dark:text-amber-400",
  "from-rose-500/20 to-rose-600/20 text-rose-600 dark:text-rose-400",
  "from-cyan-500/20 to-cyan-600/20 text-cyan-600 dark:text-cyan-400",
  "from-orange-500/20 to-orange-600/20 text-orange-600 dark:text-orange-400",
  "from-indigo-500/20 to-indigo-600/20 text-indigo-600 dark:text-indigo-400",
] as const;

function getPalette(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_BG[Math.abs(h) % AVATAR_BG.length]!;
}

function Avatar({ name, phone, seed, size = "md" }: {
  name: string | null; phone: string; seed: string; size?: "sm" | "md" | "lg";
}) {
  const p = getPalette(seed);
  const sz = { sm: "size-8 text-[10px]", md: "size-10 text-xs", lg: "size-12 text-sm" }[size];
  return (
    <div className={[sz, "rounded-full flex items-center justify-center font-bold shrink-0 tracking-wide bg-gradient-to-br ring-2 ring-white/10 dark:ring-black/20", p].join(" ")}>
      {getInitials(name, phone)}
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const isAgent = mode === "agent";
  return (
    <span className={["inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider rounded-md px-2 py-1", isAgent ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25" : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"].join(" ")}>
      {isAgent ? <Bot className="size-2.5" /> : <User className="size-2.5" />}
      {isAgent ? "AI Agent" : "Human"}
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

  const { conversations, selectedId } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [conversations, selectedId]);

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

  async function readJson<T>(res: Response): Promise<T> {
    const body = await res.text();
    if (!res.ok) throw new Error(body || `HTTP ${res.status}`);
    return body ? (JSON.parse(body) as T) : ([] as unknown as T);
  }

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

  useEffect(() => {
    if (selectedId) {
      setMessages([]);
      void fetchMessages(selectedId);
    }
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages]);

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
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, async () => {
        try {
          const res = await fetch("/api/conversations");
          const body = await res.text();
          if (res.ok) {
            const data: ConversationWithLastMessage[] = body ? JSON.parse(body) : [];
            setChatState({ conversations: data, sidebarLoading: false });
          }
        } catch {}
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [selectedId, supabase]);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      selectConversation(conversations[0]!.id);
    }
  }, [selectedId, conversations]);

  async function toggleMode() {
    if (!selected) return;
    const newMode: "agent" | "human" = selected.mode === "agent" ? "human" : "agent";
    try {
      const res = await fetch(`/api/conversations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = conversations.map((c) =>
        c.id === selected.id ? { ...c, mode: newMode } : c
      );
      setChatState({ conversations: updated });
    } catch {
      toast.error("Failed to toggle mode.");
    }
  }

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setInput("");
      void fetchMessages(selectedId);
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* ── Elevated Header ── */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border/50 bg-background/70 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3 min-w-0">
          {selected ? (
            <>
              <button
                onClick={() => selectConversation(null)}
                aria-label="Back to conversation list"
                className="size-8 rounded-xl hover:bg-accent border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0 md:hidden"
              >
                <ArrowLeft className="size-4" />
              </button>
              <Avatar name={selected.name} phone={selected.phone} seed={selected.id} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-foreground truncate leading-tight">
                    {selected.name || selected.phone}
                  </h2>
                  {selected.session_state === "verified" && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border border-emerald-500/25 px-1.5 py-0.5 rounded-md leading-none shrink-0">
                      <ShieldCheck className="size-2.5" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground/60 font-mono truncate">{selected.phone}</span>
                  <span className="size-1 rounded-full bg-muted-foreground/20" />
                  <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                    <Globe className="size-2.5" />
                    {selected.preferred_language?.toUpperCase() || "EN"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center text-primary">
                <MessageSquare className="size-5" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-semibold text-sm text-foreground">Messages</h1>
                <p className="text-[11px] text-muted-foreground/60">Select a conversation to begin</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selected && (
            <>
              <button
                onClick={() => void toggleMode()}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all shrink-0 cursor-pointer",
                  selected.mode === "agent"
                    ? "bg-muted/60 border-border/40 text-foreground hover:bg-accent"
                    : "bg-primary border-transparent text-primary-foreground hover:opacity-90 shadow-xs",
                ].join(" ")}
              >
                {selected.mode === "agent" ? <Bot className="size-3.5" strokeWidth={1.8} /> : <User className="size-3.5" />}
                <span className="hidden sm:inline">{selected.mode === "agent" ? "AI Agent" : "Human"}</span>
                <ChevronRight className="size-3 opacity-30" />
              </button>
              <div className="w-px h-5 bg-border/40 shrink-0" />
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        {backendNotice && (
          <div className="mx-4 md:mx-6 mt-3 flex items-center gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="size-3.5 shrink-0" />
            {backendNotice}
          </div>
        )}

        {!selected ? (
          /* ── Welcoming Empty State ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">
            <div className="relative">
              <div className="size-28 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 flex items-center justify-center shadow-sm">
                <MessageSquare className="size-12 text-primary/40" strokeWidth={1.2} />
              </div>
              <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <Sparkles className="size-3 text-emerald-500" />
              </div>
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-lg font-semibold text-foreground/80 tracking-tight">
                Welcome to LexBot Chat
              </h2>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                Your AI-powered legal assistant is ready. Select a conversation from the sidebar to review messages, or wait for incoming client inquiries to appear automatically.
              </p>
            </div>
            <div className="flex items-center gap-6 text-[11px] text-muted-foreground/50">
              <span className="flex items-center gap-1.5">
                <Bot className="size-3.5" />
                AI-powered replies
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" />
                End-to-end encrypted
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="size-3.5" />
                Multi-language
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Messages ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6 [scrollbar-width:thin] scroll-smooth"
            >
              {messagesError ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-12">
                  <div className="size-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                    <AlertCircle className="size-7" />
                  </div>
                  <p className="text-sm text-muted-foreground">{messagesError}</p>
                  <button
                    onClick={() => selected && void fetchMessages(selected.id)}
                    className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-foreground/80 font-medium text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : messagesLoading ? (
                <div className="h-full flex flex-col justify-end gap-4 p-4 max-w-3xl mx-auto">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={"flex gap-3 items-end " + (i % 2 === 0 ? "justify-start" : "justify-end")}>
                      {i % 2 === 0 && <Skeleton className="size-8 rounded-full shrink-0" />}
                      <div className="space-y-1.5">
                        <Skeleton className={"h-10 w-52 rounded-2xl " + (i % 2 === 0 ? "rounded-bl-sm" : "rounded-br-sm")} />
                        <Skeleton className="h-2 w-12" />
                      </div>
                      {i % 2 !== 0 && <Skeleton className="size-8 rounded-full shrink-0" />}
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-5 text-center">
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/8 to-primary/5 border border-primary/10 flex items-center justify-center">
                    <Sparkles className="size-7 text-primary/30" strokeWidth={1.4} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground/70">
                      Start a conversation
                    </p>
                    <p className="text-xs text-muted-foreground/50 max-w-xs leading-relaxed">
                      Type a message below and the AI will respond based on {selected.name || "this client"}&apos;s case context.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {groupedMessages.map((group, gi) => (
                    <div key={group.date}>
                      {/* Date Separator */}
                      <div className="flex items-center gap-4 my-8 first:mt-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
                        <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/40 px-2 select-none">
                          {group.date === new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
                            ? "Today"
                            : group.date === new Date(Date.now() - 86400000).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
                            ? "Yesterday"
                            : group.date}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
                      </div>

                      {/* Message Bubbles */}
                      <div className="space-y-1.5">
                        {group.msgs.map((msg, i) => {
                          const isUser = msg.role === "user";
                          const prevSame = i > 0 && group.msgs[i - 1]?.role === msg.role;
                          const nextSame = group.msgs[i + 1]?.role === msg.role;
                          const isLast = !nextSame;
                          const isFirst = !prevSame;
                          const bubbleRadius = isFirst
                            ? isUser ? "rounded-tl-lg" : "rounded-tr-lg"
                            : isUser ? "rounded-tl-sm" : "rounded-tr-sm";
                          const bottomRadius = isLast
                            ? "rounded-bl-2xl rounded-br-2xl"
                            : "rounded-bl-sm rounded-br-sm";

                          return (
                            <div
                              key={msg.id}
                              className={["flex items-end gap-2.5 px-1", isUser ? "justify-start" : "justify-end", isLast ? "mb-3" : "mb-0"].join(" ")}
                              style={{
                                animation: "messageIn 0.3s ease-out both",
                                animationDelay: `${(gi * 5 + i) * 25}ms`,
                              }}
                            >
                              {/* User avatar (left) */}
                              {isUser && (
                                <div className={["shrink-0 transition-all duration-200", isLast ? "opacity-100 scale-100" : "opacity-0 scale-75"].join(" ")}>
                                  <Avatar name={selected.name} phone={selected.phone} seed={selected.id} size="sm" />
                                </div>
                              )}

                              <div className={"flex flex-col max-w-[75%] md:max-w-[65%] " + (isUser ? "items-start" : "items-end")}>
                                {/* Bubble */}
                                <div
                                  className={[
                                    "px-4 py-2.5 text-[13.5px] leading-relaxed",
                                    isUser
                                      ? `bg-muted/70 text-foreground border border-border/40 ${bubbleRadius} ${bottomRadius}`
                                      : `bg-primary text-primary-foreground ${bubbleRadius} ${bottomRadius} shadow-sm`,
                                  ].join(" ")}
                                >
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                </div>

                                {/* Footer (time, AI badge, read receipt) */}
                                {isLast && (
                                  <div className={"flex items-center gap-1.5 mt-1 px-1.5 text-[10px] text-muted-foreground/40 " + (isUser ? "" : "justify-end")}>
                                    {!isUser && (
                                      <span className="flex items-center gap-1 text-primary/50">
                                        <Sparkles className="size-2.5" />
                                        AI
                                      </span>
                                    )}
                                    <span>{formatTime(msg.created_at)}</span>
                                    {!isUser && <CheckCheck className="size-3 text-muted-foreground/20" />}
                                  </div>
                                )}
                              </div>

                              {/* AI avatar (right) */}
                              {!isUser && (
                                <div className={["shrink-0 transition-all duration-200", isLast ? "opacity-100 scale-100" : "opacity-0 scale-75"].join(" ")}>
                                  <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                                    <Bot className="size-4" strokeWidth={1.8} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Elevated Input Area ── */}
            <div className="shrink-0 border-t border-border/30 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pt-3 pb-5 md:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-end gap-2.5 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3 focus-within:border-ring/40 focus-within:ring-1 focus-within:ring-ring/15 transition-all shadow-sm hover:shadow-md">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                    placeholder={selected ? "Type a message…" : "Select a conversation to start messaging"}
                    disabled={!selected || messagesLoading}
                    rows={1}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-foreground placeholder:text-muted-foreground/35 resize-none leading-relaxed disabled:opacity-40"
                  />
                  <button
                    onClick={() => void handleSend()}
                    disabled={sending || !selectedId || !input.trim() || messagesLoading}
                    aria-label="Send message"
                    className={[
                      "size-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer",
                      input.trim() && selectedId && !messagesLoading
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs active:scale-90"
                        : "bg-muted/50 text-muted-foreground/30 cursor-not-allowed",
                      sending ? "opacity-50 pointer-events-none" : "",
                    ].join(" ")}
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </button>
                </div>
                <p className="mt-2 text-center text-[9.5px] text-muted-foreground/35 tracking-wide">
                  {selected ? (
                    <span className="flex items-center justify-center gap-2">
                      <ModeBadge mode={selected.mode} />
                      <span className="size-1 rounded-full bg-muted-foreground/20" />
                      <kbd className="font-mono text-[8px] bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded-md">Enter</kbd>
                      <span>to send ·</span>
                      <kbd className="font-mono text-[8px] bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded-md">Shift + Enter</kbd>
                      <span>for new line</span>
                    </span>
                  ) : (
                    "Select a conversation to start messaging"
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes messageIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
