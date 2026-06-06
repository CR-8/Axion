"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { Bot } from "lucide-react";

import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SIDEBAR_ITEMS = [
  { href: "/", label: "Dashboard" },
  { label: "Clients", items: [{ href: "/clients", label: "Client List" }, { href: "/clients/new", label: "New Client" }] },
  { label: "Cases", items: [{ href: "/cases", label: "Case List" }, { href: "/cases/new", label: "New Case" }] },
  { href: "/calendar", label: "Hearing Calendar" },
  { href: "/documents", label: "Documents" },
  { href: "/chat", label: "WhatsApp Chat" },
  { href: "/settings", label: "Settings" },
];

function getActiveLabel(pathname: string) {
  for (const item of SIDEBAR_ITEMS) {
    if (item.href) {
      const match = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      if (match) return item.label;
    }
    if (item.items) {
      for (const sub of item.items) {
        if (pathname === sub.href) {
          return `${item.label} / ${sub.label}`;
        }
      }
    }
  }
  return "Dashboard";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null);
  const [orgName, setOrgName] = useState<string>("Your Firm");

  const loadUser = useCallback(async () => {
    try {
      const supabase = getBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser({ email: user.email || "", full_name: user.user_metadata?.full_name });

      // Fetch org
      const { data: member } = await supabase
        .from("org_members")
        .select("org_id, organizations(name)")
        .eq("user_id", user.id)
        .single();

      if (member?.organizations) {
        const org = member.organizations as { name?: string } | null;
        setOrgName(org?.name || "Your Firm");
      }
    } catch {
      // Fail silently
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
  useEffect(() => { void loadUser(); }, [loadUser]);

  async function handleLogout() {
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      alert("Failed to log out.");
    }
  }

  return (
    <SidebarProvider
        style={
          {
            "--sidebar-width": "350px",
          } as React.CSSProperties
        }
      >
      <AppSidebar
        user={{
          name: user?.full_name || "Admin",
          email: user?.email || "admin@lexbot.app",
          avatar: "",
        }}
        orgName={orgName}
        onLogout={() => void handleLogout()}
      />

      {/* Main Content Area */}
      <SidebarInset className={pathname === "/chat" ? "h-full overflow-hidden flex flex-col" : ""}>
        {pathname !== "/chat" && (
          <header className="flex h-20 shrink-0 items-center gap-2 border-b border-border-default bg-surface px-4">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">LexBot</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="capitalize">
                    {getActiveLabel(pathname)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => {
                  const event = new KeyboardEvent("keydown", {
                    key: "k",
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                  });
                  document.dispatchEvent(event);
                }}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-surface border border-border-default rounded-xl text-[11px] font-semibold text-text-secondary hover:text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <span>Search...</span>
                <kbd className="bg-background border border-border-default px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight">Ctrl K</kbd>
              </button>
              <NotificationBell />
              <ThemeToggle />
              <div className="flex items-center gap-1.5 text-[11px] text-foreground/90 bg-muted border border-border-default rounded-full px-3 py-1">
                <Bot className="size-3 text-foreground/60" />
                <span className="font-semibold">Bot Active</span>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </header>
        )}

        {/* Page children */}
        <main className={pathname === "/chat" ? "flex-1 flex flex-col overflow-hidden relative" : "flex-1 overflow-y-auto bg-background"}>
          {children}
          <CommandPalette />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
