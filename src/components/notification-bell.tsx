"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Notification } from "@/lib/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent
    }
  }, []);

  // Fetch on mount and poll every 30s
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) void fetchNotifications();
        }}
        className="relative size-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-muted transition-all cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-surface border border-border-default rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default/60">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  disabled={loading}
                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="size-6 rounded-md flex items-center justify-center text-text-secondary hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-72 divide-y divide-border-default/30">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="size-6 text-text-secondary/30 mx-auto mb-2" />
                <p className="text-xs text-text-secondary/50">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex gap-3 transition-colors hover:bg-muted/30 ${
                    !n.is_read ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className="pt-1.5 shrink-0">
                    {!n.is_read ? (
                      <div className="size-2 rounded-full bg-primary" />
                    ) : (
                      <div className="size-2 rounded-full bg-border-default/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/90 truncate">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-text-secondary/70 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-text-secondary/40 font-mono">
                        {timeAgo(n.created_at)}
                      </span>
                      {n.case_id && (
                        <Link
                          href={`/cases/${n.case_id}`}
                          onClick={() => {
                            if (!n.is_read) void markAsRead(n.id);
                            setOpen(false);
                          }}
                          className="text-[9px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          View Case <ExternalLink className="size-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Mark read */}
                  {!n.is_read && (
                    <button
                      onClick={() => void markAsRead(n.id)}
                      className="size-6 shrink-0 rounded-md flex items-center justify-center text-text-secondary/40 hover:text-primary hover:bg-muted transition-colors cursor-pointer self-start mt-0.5"
                      title="Mark as read"
                    >
                      <Check className="size-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
