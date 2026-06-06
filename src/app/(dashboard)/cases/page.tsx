"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { Briefcase, Plus, Calendar, ChevronRight, AlertCircle, Search } from "lucide-react";
import Link from "next/link";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS, type CaseStatus, type CaseType } from "@/lib/types";

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

interface CaseRow {
  id: string;
  case_number: string;
  court_name: string | null;
  court_city: string | null;
  case_type: CaseType;
  status: CaseStatus;
  next_hearing_date: string | null;
  assigned_lawyer_name: string | null;
  updated_at: string;
  clients: { name: string; phone: string } | null;
}

const NEUTRAL_STATUS_COLORS: Record<CaseStatus, string> = {
  active: "text-foreground bg-muted border-border-default",
  hearing_scheduled: "text-text-secondary bg-surface border-border-default",
  adjourned: "text-text-secondary bg-muted/50 border-border-default/50",
  judgement_pending: "text-foreground/80 bg-surface border-border-default",
  closed: "text-text-secondary/40 bg-muted/20 border-border-default/40",
};

export default function CasesPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "">("");

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
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load authentication data.");
      setLoading(false);
    }
  }, []);

  const loadCases = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ org_id: orgId });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/cases?${params}`);
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to load cases.");
      }
      setCases(await res.json());
    } catch (e: unknown) {
      setError((e as Error).message || "An unexpected error occurred while loading cases.");
    } finally {
      setLoading(false);
    }
  }, [orgId, search, statusFilter]);

  useEffect(() => { void loadOrgId(); }, [loadOrgId]);
  useEffect(() => { void loadCases(); }, [loadCases]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    if (!orgId) {
      void loadOrgId();
    } else {
      void loadCases();
    }
  };

  const columns = useMemo<ColumnDef<CaseRow>[]>(() => [
    {
      accessorKey: "case_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Case" />,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div>
            <p className="text-foreground/90 font-medium font-mono text-[13px]">{c.case_number}</p>
            <p className="text-text-secondary text-[10px] mt-0.5">{CASE_TYPE_LABELS[c.case_type as CaseType]}</p>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "client",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
      cell: ({ row }) => {
        const name = row.original.clients?.name || "—";
        return <span className="text-foreground/80 font-medium">{name}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "court_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Court" />,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div>
            <p className="text-foreground/75 text-[12px] truncate max-w-40">{c.court_name || "—"}</p>
            <p className="text-text-secondary text-[10px] mt-0.5">{c.court_city || ""}</p>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as CaseStatus;
        return (
          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${NEUTRAL_STATUS_COLORS[status]}`}>
            {CASE_STATUS_LABELS[status]}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "next_hearing_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Next Hearing" />,
      cell: ({ row }) => {
        const dateStr = row.getValue("next_hearing_date") as string | null;
        if (!dateStr) return <span className="text-text-secondary/50 text-[12px]">—</span>;
        const hearingDate = new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const isOverdue = new Date(dateStr) < new Date();
        return (
          <div className={`flex items-center gap-1.5 text-[12px] ${isOverdue ? "text-rose-400 font-semibold" : "text-text-secondary"}`}>
            <Calendar className="size-3.5 shrink-0" />
            <span>{hearingDate}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "assigned_lawyer_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lawyer" />,
      cell: ({ row }) => {
        const lawyer = row.getValue("assigned_lawyer_name") as string | null;
        return <span className="text-text-secondary text-[12px]">{lawyer || "—"}</span>;
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end">
            <Link
              href={`/cases/${c.id}`}
              className="size-7 rounded-lg flex items-center justify-center text-text-secondary/40 hover:text-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        );
      },
      enableSorting: false,
    }
  ], []);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return cases.slice(start, start + ITEMS_PER_PAGE);
  }, [cases, currentPage]);

  const totalPages = Math.ceil(cases.length / ITEMS_PER_PAGE);

  const { table } = useDataTable({
    data: paginatedCases,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Briefcase className="size-6 text-text-secondary" strokeWidth={1.5} />
            Cases
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">{cases.length} cases total</p>
        </div>
        <Link
          href="/cases/new"
          id="new-case-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl transition-colors"
        >
          <Plus className="size-4" />
          New Case
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 flex items-center gap-2.5 bg-surface border border-border-default rounded-xl px-3 py-2.5 focus-within:border-foreground/20 transition-colors">
          <Search className="size-4 text-text-secondary/50 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case number or court…"
            className="flex-1 bg-transparent outline-none text-sm text-foreground/90 placeholder:text-text-secondary/50"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CaseStatus | "")}
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
            <h3 className="text-red-400 font-semibold text-[15px]">Failed to Load Cases</h3>
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
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <div className="flex-1 flex gap-4 justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-20 rounded-lg" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface border border-border-default rounded-3xl gap-4 max-w-md mx-auto my-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="size-14 rounded-2xl bg-muted border border-border-default flex items-center justify-center text-text-secondary shadow-inner">
            <Briefcase className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground/80 font-semibold text-[15px]">No Cases Found</h3>
            <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">
              {search ? "No cases match your current search query." : "Establish your first active case record to begin managing court hearings."}
            </p>
          </div>
          {!search && (
            <Link
              href="/cases/new"
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              + Create Case
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
