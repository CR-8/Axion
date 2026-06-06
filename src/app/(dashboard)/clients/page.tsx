"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Users, Plus, Phone, ChevronRight, Copy, Check, AlertCircle, Search } from "lucide-react";
import Link from "next/link";
import { type CaseStatus } from "@/lib/types";

// Tanstack & UI Table Components
import { type ColumnDef, DataTableColumnHeader, useDataTable, flexRender } from "@/components/ui/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ClientRow {
  id: string;
  name: string;
  phone: string;
  preferred_language: string;
  created_at: string;
  cases: Array<{ id: string; case_number: string; status: CaseStatus }>;
}

const NEUTRAL_STATUS_COLORS: Record<CaseStatus, string> = {
  active: "text-foreground bg-muted border-border-default",
  hearing_scheduled: "text-text-secondary bg-surface border-border-default",
  adjourned: "text-text-secondary bg-muted/50 border-border-default/50",
  judgement_pending: "text-foreground/80 bg-surface border-border-default",
  closed: "text-text-secondary/40 bg-muted/20 border-border-default/40",
};

const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  active: "Active",
  hearing_scheduled: "Hearing Scheduled",
  adjourned: "Adjourned",
  judgement_pending: "Judgement Pending",
  closed: "Closed",
};

export default function ClientsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadOrgId = useCallback(async () => {
    try {
      setError(null);
      const supabase = getBrowserSupabase();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;
      const { data: m, error: memberError } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
      if (memberError) throw memberError;
      if (m?.org_id) setOrgId(m.org_id);
    } catch (e: any) {
      setError(e.message || "Failed to load authorization data.");
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ org_id: orgId });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to fetch clients.");
      }
      setClients(await res.json());
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred while loading clients.");
    } finally {
      setLoading(false);
    }
  }, [orgId, search, statusFilter]);

  useEffect(() => { void loadOrgId(); }, [loadOrgId]);
  useEffect(() => { void loadClients(); }, [loadClients]);

  function copyOnboarding(client: ClientRow) {
    const caseId = client.cases?.[0]?.case_number;
    const text = `Hello ${client.name}, your Case ID is *${caseId || "assigned by your lawyer"}*. Message us on WhatsApp and share this ID to track your case updates.`;
    navigator.clipboard.writeText(text);
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    if (!orgId) {
      void loadOrgId();
    } else {
      void loadClients();
    }
  };

  const columns = useMemo<ColumnDef<ClientRow>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted border border-border-default flex items-center justify-center text-foreground text-xs font-semibold shrink-0">
              {client.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-foreground/90 font-medium">{client.name}</p>
              <p className="text-text-secondary text-[10px] mt-0.5">Added {new Date(client.created_at).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string;
        return (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Phone className="size-3 text-text-secondary/40 shrink-0" />
            <span className="font-mono text-[12px]">{phone}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "preferred_language",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Language" />,
      cell: ({ row }) => {
        const lang = row.getValue("preferred_language") as string;
        return <span className="text-text-secondary text-[12px] uppercase font-semibold">{lang}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: "cases",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cases" />,
      cell: ({ row }) => {
        const cases = row.original.cases || [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {cases.slice(0, 2).map((cs: any) => (
              <span key={cs.id} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${NEUTRAL_STATUS_COLORS[cs.status as CaseStatus]}`}>
                {cs.case_number}
              </span>
            ))}
            {cases.length > 2 && (
              <span className="text-[10px] text-text-secondary/60">+{cases.length - 2}</span>
            )}
            {cases.length === 0 && (
              <span className="text-text-secondary/50 text-[11px]">No cases</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const client = row.original;
        return (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyOnboarding(client);
              }}
              title="Copy onboarding message"
              className="size-7 rounded-lg flex items-center justify-center text-text-secondary/50 hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              {copiedId === client.id ? <Check className="size-3.5 text-foreground" /> : <Copy className="size-3.5" />}
            </button>
            <Link
              href={`/clients/${client.id}`}
              className="size-7 rounded-lg flex items-center justify-center text-text-secondary/50 hover:text-foreground/80 hover:bg-muted transition-all"
            >
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        );
      },
      enableSorting: false,
    }
  ], [copiedId]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return clients.slice(start, start + ITEMS_PER_PAGE);
  }, [clients, currentPage]);

  const totalPages = Math.ceil(clients.length / ITEMS_PER_PAGE);

  const { table } = useDataTable({
    data: paginatedClients,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="size-6 text-text-secondary" strokeWidth={1.5} />
            Clients
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">{clients.length} clients registered</p>
        </div>
        <Link
          href="/clients/new"
          id="new-client-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl transition-colors"
        >
          <Plus className="size-4" />
          New Client
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 flex items-center gap-2.5 bg-surface border border-border-default rounded-xl px-3 py-2.5 focus-within:border-foreground/20 transition-colors">
          <Search className="size-4 text-text-secondary/50 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="flex-1 bg-transparent outline-none text-sm text-foreground/90 placeholder:text-text-secondary/50"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface border border-border-default rounded-xl px-3 py-2.5 text-sm text-foreground/80 outline-none focus:border-foreground/20 transition-colors"
        >
          <option value="">All Statuses</option>
          {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
            <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* States */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-red-500/[0.02] border border-red-500/10 rounded-3xl gap-4 max-w-md mx-auto my-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-red-400 font-semibold text-[15px]">Failed to Load Clients</h3>
            <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-muted border border-border-default hover:bg-surface-elevated text-foreground font-medium text-xs rounded-xl transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="bg-surface border border-border-default rounded-2xl overflow-hidden divide-y divide-border-default/40">
          <div className="h-10 bg-surface-elevated animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface border border-border-default rounded-3xl gap-4 max-w-md mx-auto my-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="size-14 rounded-2xl bg-muted border border-border-default flex items-center justify-center text-text-secondary shadow-inner">
            <Users className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground/80 font-semibold text-[15px]">No Clients Found</h3>
            <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">
              {search ? "No clients match your current search queries." : "Add your first legal client to start tracking their cases and messages."}
            </p>
          </div>
          {!search && (
            <Link
              href="/clients/new"
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              + Add Client
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border-default rounded-2xl overflow-hidden">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="min-w-[800px]">
              <Table className="table-fixed border-separate border-spacing-0 [&_tr:not(:last-child)_td]:border-b border-border-default">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="h-12 border-y border-border-default bg-muted/20 px-4 text-left first:pl-5 last:pr-5 select-none text-text-secondary"
                        >
                          {header.isPlaceholder
                             ? null
                             : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors group">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3.5 first:pl-5 last:pr-5 text-foreground/90 border-border-default/40">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border-default flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          
          <p className="mt-2 text-center text-xs text-text-secondary/40 sm:hidden py-2 border-t border-border-default bg-muted/10">
            ← Swipe to see more details →
          </p>
        </div>
      )}
    </div>
  );
}
