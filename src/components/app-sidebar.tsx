"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  FolderOpen,
  MessageSquare,
  Settings,
  Search,
  Bot,
  User,
  ShieldCheck,
  AlertCircle,
  Command,
} from "lucide-react"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import type { ConversationWithLastMessage } from "@/lib/types"
import { useChatStore, selectConversation, setChatState, getChatState } from "@/lib/chat-store"

/* ─────────────────────────────────────────────
 * Navigation data — preserves all existing URLs
 * ───────────────────────────────────────────── */
interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  isActive?: boolean
  items?: { title: string; url: string }[]
}

const navData: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
    items: [
      { title: "Client List", url: "/clients" },
      { title: "New Client", url: "/clients/new" },
    ],
  },
  {
    title: "Cases",
    url: "/cases",
    icon: Briefcase,
    items: [
      { title: "Case List", url: "/cases" },
      { title: "New Case", url: "/cases/new" },
    ],
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FolderOpen,
  },
  {
    title: "WhatsApp Chat",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

/* ─────────────────────────────────────────────
 * Chat helpers (conversation list in sidebar)
 * ───────────────────────────────────────────── */
type TriageTab = "all" | "unverified" | "agent" | "human"

const TRIAGE_ITEMS: { id: TriageTab; title: string }[] = [
  { id: "all", title: "All" },
  { id: "unverified", title: "Unread" },
  { id: "agent", title: "AI" },
  { id: "human", title: "Human" },
]

const AVATAR_BG = [
  "from-blue-500/20 to-blue-600/20 text-blue-600 dark:text-blue-400",
  "from-emerald-500/20 to-emerald-600/20 text-emerald-600 dark:text-emerald-400",
  "from-violet-500/20 to-violet-600/20 text-violet-600 dark:text-violet-400",
  "from-amber-500/20 to-amber-600/20 text-amber-600 dark:text-amber-400",
  "from-rose-500/20 to-rose-600/20 text-rose-600 dark:text-rose-400",
  "from-cyan-500/20 to-cyan-600/20 text-cyan-600 dark:text-cyan-400",
  "from-orange-500/20 to-orange-600/20 text-orange-600 dark:text-orange-400",
  "from-indigo-500/20 to-indigo-600/20 text-indigo-600 dark:text-indigo-400",
] as const

function getInitials(name: string | null, phone: string) {
  if (name) {
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? (parts[0]![0]! + parts[1]![0]!).toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }
  return phone.slice(-2)
}

function getPalette(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_BG[Math.abs(h) % AVATAR_BG.length]!
}

function ChatAvatar({ name, phone, seed }: { name: string | null; phone: string; seed: string }) {
  const p = getPalette(seed)
  return (
    <div className={["size-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 tracking-wide bg-gradient-to-br", p].join(" ")}>
      {getInitials(name, phone)}
    </div>
  )
}

function ChatModeBadge({ mode }: { mode: string }) {
  const isAgent = mode === "agent"
  return (
    <span className={["inline-flex items-center gap-1 text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded-md", isAgent ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"].join(" ")}>
      {isAgent ? <Bot className="size-2" /> : <User className="size-2" />}
      {isAgent ? "AI" : "You"}
    </span>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

/* ─────────────────────────────────────────────
 * Chat conversation list panel content
 * ───────────────────────────────────────────── */
function ChatConversationList() {
  const isChatRoute = usePathname().startsWith("/chat")
  const { conversations, selectedId, sidebarLoading, sidebarError } = useChatStore()
  const [search, setSearch] = React.useState("")
  const [triageTab, setTriageTab] = React.useState<TriageTab>("all")

  React.useEffect(() => {
    if (!isChatRoute) return
    async function fetchConversations() {
      const existing = getChatState()
      if (existing.conversations.length > 0 && !existing.sidebarLoading) return
      setChatState({ sidebarLoading: true, sidebarError: null })
      try {
        const res = await fetch("/api/conversations")
        const body = await res.text()
        if (!res.ok) throw new Error(body || `HTTP ${res.status}`)
        const data: ConversationWithLastMessage[] = body ? JSON.parse(body) : []
        setChatState({ conversations: data, sidebarLoading: false })
      } catch (e: unknown) {
        setChatState({
          sidebarLoading: false,
          sidebarError: (e as Error).message || "Failed to load conversations.",
        })
      }
    }
    void fetchConversations()
  }, [isChatRoute])

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return conversations.filter((c) => {
      const matchesSearch =
        (c.name ?? "").toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.last_message ?? "").toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (triageTab === "unverified") return c.session_state !== "verified"
      if (triageTab === "agent") return c.mode === "agent"
      if (triageTab === "human") return c.mode === "human"
      return true
    })
  }, [conversations, search, triageTab])

  const counts = React.useMemo(() => ({
    all: conversations.length,
    unverified: conversations.filter((c) => c.session_state !== "verified").length,
    agent: conversations.filter((c) => c.mode === "agent").length,
    human: conversations.filter((c) => c.mode === "human").length,
  }), [conversations])

  return (
    <>
      {/* Triage tabs */}
      <div className="flex items-center gap-0.5 px-4 pt-2 pb-1">
        {TRIAGE_ITEMS.map((item) => {
          const isActive = triageTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setTriageTab(item.id)}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer shrink-0",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              ].join(" ")}
            >
              <span>{item.title}</span>
              {counts[item.id] > 0 && (
                <span className={["text-[10px] font-semibold tabular-nums", isActive ? "text-sidebar-accent-foreground/70" : "text-sidebar-foreground/40"].join(" ")}>
                  {counts[item.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative px-4 pb-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-3 text-sidebar-foreground/40 pointer-events-none" />
        <SidebarInput
          placeholder="Search conversations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-7 text-xs h-8 rounded-lg bg-sidebar-accent/30 border-sidebar-border/50"
        />
      </div>

      {/* Conversation list */}
      <SidebarGroup className="px-0 mt-0">
        <SidebarGroupContent>
          {sidebarError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
              <div className="size-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <AlertCircle className="size-5" strokeWidth={1.4} />
              </div>
              <p className="text-xs text-sidebar-foreground/60">{sidebarError}</p>
              <button
                onClick={() => {
                  setChatState({ sidebarLoading: true, sidebarError: null })
                  setChatState({ conversations: [], sidebarLoading: false })
                }}
                className="px-3 py-1.5 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium text-[11px] rounded-lg transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : sidebarLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="size-8 rounded-full shrink-0 bg-sidebar-accent/50" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24 bg-sidebar-accent/30" />
                    <Skeleton className="h-2 w-36 bg-sidebar-accent/30" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sidebar-foreground/30">
              <div className="size-10 rounded-xl bg-sidebar-accent/50 border border-sidebar-border flex items-center justify-center">
                <MessageSquare className="size-5" strokeWidth={1.4} />
              </div>
              <p className="text-xs text-sidebar-foreground/40">
                {search ? "No conversations match" : "No conversations yet"}
              </p>
            </div>
          ) : (
            <div className="py-0.5">
              {filtered.map((convo) => {
                const isSelected = selectedId === convo.id
                return (
                  <button
                    key={convo.id}
                    onClick={() => selectConversation(convo.id)}
                    className={[
                      "w-full text-left flex items-start gap-3 px-4 py-2.5 transition-all duration-150 cursor-pointer group relative border-l-2",
                      isSelected
                        ? "bg-sidebar-accent border-l-primary"
                        : "border-l-transparent hover:bg-sidebar-accent/50",
                    ].join(" ")}
                  >
                    <ChatAvatar name={convo.name} phone={convo.phone} seed={convo.id} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={["truncate text-sm font-medium leading-none", isSelected ? "text-sidebar-accent-foreground" : "text-sidebar-foreground"].join(" ")}>
                          {convo.name || convo.phone}
                        </span>
                        <span className="shrink-0 text-[9px] text-sidebar-foreground/40 tabular-nums">
                          {formatDate(convo.updated_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-sidebar-foreground/50 leading-relaxed">
                        {convo.last_message || "No messages yet"}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <ChatModeBadge mode={convo.mode} />
                        {convo.session_state === "verified" && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                            <ShieldCheck className="size-2" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

/* ─────────────────────────────────────────────
 * Sub-links panel for non-chat nav items
 * ───────────────────────────────────────────── */
function NavSubLinks({ item, pathname }: { item: NavItem; pathname: string }) {
  if (!item.items || item.items.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="px-2">
      <SidebarGroupContent>
        <SidebarMenu>
          {item.items.map((sub) => {
            const isSubActive = pathname === sub.url
            return (
              <SidebarMenuItem key={sub.url}>
                <SidebarMenuButton asChild isActive={isSubActive}>
                  <Link href={sub.url}>
                    <span>{sub.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/* ─────────────────────────────────────────────
 * Main AppSidebar component — dual-pane layout
 * ───────────────────────────────────────────── */
export function AppSidebar({
  user = { name: "Admin", email: "admin@lexbot.app", avatar: "" },
  orgName = "Your Firm",
  onLogout,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string; email: string; avatar: string }
  orgName?: string
  onLogout?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpen } = useSidebar()
  const setOpenRef = React.useRef(setOpen)
  React.useEffect(() => { setOpenRef.current = setOpen }, [setOpen])

  // Find which nav item is currently active based on pathname
  const activeNavItem = React.useMemo(() => {
    return navData.find((item) =>
      item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)
    ) ?? navData[0]!
  }, [pathname])

  const [selectedItem, setSelectedItem] = React.useState(activeNavItem)

  // Keep selectedItem in sync when pathname changes
  // Auto-expand for items with sub-items or chat, auto-collapse for simple pages
  React.useEffect(() => {
    setSelectedItem(activeNavItem)
    const needsPanel = !!(activeNavItem.items && activeNavItem.items.length > 0) || activeNavItem.url === "/chat"
    setOpenRef.current(needsPanel)
  }, [activeNavItem])

  const isChat = selectedItem.url === "/chat"
  const hasSubItems = !!(selectedItem.items && selectedItem.items.length > 0)
  const showContentPanel = isChat || hasSubItems

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* ── First sidebar: Icon rail ── */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{orgName}</span>
                    <span className="truncate text-xs">LexBot CRM</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navData.map((item) => {
                  const isItemActive = item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{
                          children: item.title,
                          hidden: false,
                        }}
                        onClick={() => {
                          const itemHasSubs = !!(item.items && item.items.length > 0)
                          const itemIsChat = item.url === "/chat"
                          setSelectedItem(item)
                          if (itemHasSubs || itemIsChat) {
                            // Expand sidebar to show content panel
                            setOpen(true)
                          } else {
                            // Collapse sidebar and navigate directly
                            setOpen(false)
                            router.push(item.url)
                          }
                        }}
                        isActive={isItemActive}
                        className="px-2.5 md:px-2"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} onLogout={onLogout} />
        </SidebarFooter>
      </Sidebar>

      {/* ── Second sidebar: Content panel ── */}
      {showContentPanel && (
        <Sidebar collapsible="none" className="hidden flex-1 md:flex">
          <SidebarHeader className="gap-3.5 border-b p-4">
            <div className="flex w-full items-center justify-between">
              <div className="text-base font-medium text-foreground">
                {selectedItem.title}
              </div>
            </div>
            {isChat && (
              <SidebarInput placeholder="Type to search..." />
            )}
          </SidebarHeader>
          <SidebarContent>
            {isChat ? (
              <ChatConversationList />
            ) : (
              <NavSubLinks item={selectedItem} pathname={pathname} />
            )}
          </SidebarContent>
        </Sidebar>
      )}
    </Sidebar>
  )
}
