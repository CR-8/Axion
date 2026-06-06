"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  FolderOpen,
  Settings,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";

export type ContextBodyProps = {
  search: string;
};

export type ContextPanelConfig = {
  id: string;
  title: string;
  icon: LucideIcon;
  searchPlaceholder: string;
  rightToggleLabel?: string;
  match: (pathname: string) => boolean;
  Body: (props: ContextBodyProps) => React.ReactNode;
};

function SpecEmpty({ hint }: { hint: string }) {
  return (
    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-muted border border-border-default">
        <Inbox className="size-4" strokeWidth={1.4} />
      </div>
      <p className="text-[13px] text-text-secondary/80 font-medium">
        {hint}
      </p>
      <p className="mt-1 text-[11px] text-text-secondary/50">
        Per-page widget spec is being finalised.
      </p>
    </div>
  );
}

const ClientsBody = () => (
  <SpecEmpty hint="Recent clients will appear here." />
);
const CasesBody = () => (
  <SpecEmpty hint="Active cases will appear here." />
);
const CalendarBody = () => (
  <SpecEmpty hint="Upcoming hearings will appear here." />
);
const DocumentsBody = () => (
  <SpecEmpty hint="Recent documents will appear here." />
);
const DefaultBody = () => (
  <SpecEmpty hint="Context for this page is not configured yet." />
);

export const CONTEXT_PANELS: ContextPanelConfig[] = [
  {
    id: "dashboard",
    title: "Overview",
    icon: LayoutDashboard,
    searchPlaceholder: "Search workspace...",
    match: (p) => p === "/",
    Body: DefaultBody,
  },
  {
    id: "clients",
    title: "Clients",
    icon: Users,
    searchPlaceholder: "Search clients...",
    rightToggleLabel: "Active only",
    match: (p) => p.startsWith("/clients"),
    Body: ClientsBody,
  },
  {
    id: "cases",
    title: "Cases",
    icon: Briefcase,
    searchPlaceholder: "Search cases...",
    rightToggleLabel: "Open only",
    match: (p) => p.startsWith("/cases"),
    Body: CasesBody,
  },
  {
    id: "calendar",
    title: "Hearing Calendar",
    icon: Calendar,
    searchPlaceholder: "Search hearings...",
    rightToggleLabel: "Upcoming",
    match: (p) => p.startsWith("/calendar"),
    Body: CalendarBody,
  },
  {
    id: "documents",
    title: "Documents",
    icon: FolderOpen,
    searchPlaceholder: "Search documents...",
    rightToggleLabel: "Recent",
    match: (p) => p.startsWith("/documents"),
    Body: DocumentsBody,
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    searchPlaceholder: "Search settings...",
    match: (p) => p.startsWith("/settings"),
    Body: DefaultBody,
  },
];

export function getContextPanel(pathname: string): ContextPanelConfig {
  return (
    CONTEXT_PANELS.find((c) => c.match(pathname)) ??
    CONTEXT_PANELS[0]!
  );
}

export function ContextPanel() {
  const pathname = usePathname();
  const config = getContextPanel(pathname);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    setSearch("");
  }, [config.id]);

  const Icon = config.icon;

  return (
    <Sidebar
      collapsible="none"
      className="hidden flex-1 md:flex group-data-[collapsible=icon]:hidden"
    >
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-base font-medium text-foreground">
            <span className="flex size-6 items-center justify-center rounded-md bg-muted border border-border-default">
              <Icon className="size-3.5" strokeWidth={1.8} />
            </span>
            {config.title}
          </div>
          {config.rightToggleLabel && (
            <Label className="flex items-center gap-2 text-xs text-text-secondary">
              <span>{config.rightToggleLabel}</span>
              <Switch className="shadow-none" />
            </Label>
          )}
        </div>
        <SidebarInput
          placeholder={config.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <config.Body search={search} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
