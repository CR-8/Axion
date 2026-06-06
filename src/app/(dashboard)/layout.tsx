"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Scale,
  LayoutDashboard,
  Users,
  Briefcase,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
  Bot,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";

// Sidebar & Breadcrumb UI Components
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SIDEBAR_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Clients",
    icon: Users,
    items: [
      { href: "/clients", label: "Client List" },
      { href: "/clients/new", label: "New Client" },
    ],
  },
  {
    label: "Cases",
    icon: Briefcase,
    items: [
      { href: "/cases", label: "Case List" },
      { href: "/cases/new", label: "New Case" },
    ],
  },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/chat", label: "WhatsApp Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
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
        const org = member.organizations as any;
        setOrgName(org.name || "Your Firm");
      }
    } catch {
      // Fail silently
    }
  }, []);

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
    <SidebarProvider>
      <Sidebar>
        {/* Sidebar Header / Logo */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-transparent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white shrink-0">
                  <Scale className="size-4" strokeWidth={1.8} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none min-w-0">
                  <span className="font-semibold text-white/90 text-sm tracking-tight truncate">LexBot CRM</span>
                  <span className="text-[10px] text-white/30 truncate">{orgName}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;

                  if (item.items) {
                    const isAnyChildActive = item.items.some((sub) => pathname.startsWith(sub.href));

                    return (
                      <Collapsible
                        key={item.label}
                        defaultOpen={isAnyChildActive}
                        className="group/collapsible w-full"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={isAnyChildActive} className="w-full justify-between">
                              <div className="flex items-center gap-3">
                                <Icon className={["size-4 shrink-0", isAnyChildActive ? "text-white" : "text-white/35 group-hover:text-white/60"].join(" ")} strokeWidth={1.8} />
                                <span>{item.label}</span>
                              </div>
                              <Plus className="size-3 ml-auto opacity-45 group-data-[state=open]/collapsible:hidden" />
                              <Minus className="size-3 ml-auto opacity-45 group-data-[state=closed]/collapsible:hidden" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items.map((sub) => {
                                const isSubActive = pathname === sub.href;
                                return (
                                  <SidebarMenuSubItem key={sub.href}>
                                    <SidebarMenuSubButton asChild isActive={isSubActive}>
                                      <Link href={sub.href}>
                                        {sub.label}
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  // Direct link items
                  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon className={["size-4 shrink-0", isActive ? "text-white" : "text-white/35 group-hover:text-white/60"].join(" ")} strokeWidth={1.8} />
                          <span>{item.label}</span>
                          {isActive && <ChevronRight className="size-3 ml-auto text-white/40" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="size-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/75 font-medium truncate">{user?.full_name || "Admin"}</p>
                  <p className="text-[10px] text-white/25 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => void handleLogout()}
                  title="Sign out"
                  className="size-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
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
            <div className="flex items-center gap-1.5 text-[11px] text-white/95 bg-white/5 border border-white/10 rounded-full px-3 py-1 dark:text-white/95 dark:bg-white/5 dark:border-white/10">
              <Bot className="size-3 text-white/60" />
              <span className="font-semibold">Bot Active</span>
              <span className="size-1.5 rounded-full bg-white shadow-[0_0_4px_#ffffff] animate-pulse" />
            </div>
          </div>
        </header>

        {/* Page children */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

