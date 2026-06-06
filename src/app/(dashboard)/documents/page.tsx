"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { FolderOpen, Upload, FileText, Loader2, AlertCircle, Check, X } from "lucide-react";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/types";

// Tanstack & UI Table Components
import { type ColumnDef, DataTableColumnHeader, useDataTable, flexRender } from "@/components/ui/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DocRow {
  id: string;
  name: string;
  doc_type: DocType;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  source: string;
  uploaded_by_name: string | null;
  cases: { case_number: string } | null;
  clients: { name: string } | null;
}

export default function DocumentsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  // userId is reserved for future per-user audit features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [cases, setCases] = useState<Array<{ id: string; case_number: string; client_id: string; clients: { name: string } | null }>>([]);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [docType, setDocType] = useState<DocType>("other");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // UX Enhancements States
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  async function triggerDownload(docId: string) {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to get download URL");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to download document.");
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;
      setUserId(user.id);

      const { data: m, error: memberError } = await supabase.from("org_members").select("org_id, full_name, email").eq("user_id", user.id).single();
      if (memberError) throw memberError;
      if (!m?.org_id) return;
      setOrgId(m.org_id);
      setUserName(m.full_name || m.email || "Staff");

      const [docsRes, casesRes] = await Promise.all([
        supabase.from("documents").select("*, cases(case_number), clients(name)").eq("org_id", m.org_id).order("created_at", { ascending: false }),
        supabase.from("cases").select("id, case_number, client_id, clients(name)").eq("org_id", m.org_id).order("created_at", { ascending: false }),
      ]);

      if (docsRes.error) throw docsRes.error;
      if (casesRes.error) throw casesRes.error;

      setDocs((docsRes.data || []) as DocRow[]);
      setCases((casesRes.data || []) as unknown as typeof cases);
    } catch (e: unknown) {
      setError((e as Error).message || "An unexpected error occurred while loading documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleDelete(docId: string) {
    if (!docId) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      toast.success("Document deleted successfully");
      setDeleteDialogOpen(false);
      setDocToDelete(null);
      void loadData();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to delete document.");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedCaseId || !orgId) return;

    const selectedCase = cases.find((c) => c.id === selectedCaseId);
    if (!selectedCase) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 150);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", orgId);
      formData.append("case_id", selectedCaseId);
      formData.append("client_id", selectedCase.client_id);
      formData.append("doc_type", docType);
      formData.append("uploaded_by_name", userName || "");

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
      } else {
        toast.success("Document uploaded successfully!");
        setUploadSuccess(true);
        setFile(null);
        setSelectedCaseId("");
        setDocType("other");
        if (fileRef.current) fileRef.current.value = "";
        setTimeout(() => { setUploadSuccess(false); setShowUpload(false); void loadData(); }, 2000);
      }
    } catch (e: unknown) {
      clearInterval(progressInterval);
      setUploadError((e as Error).message || "An error occurred during file upload.");
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const handleRetry = () => {
    void loadData();
  };

  const columns = useMemo<ColumnDef<DocRow>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Document" />,
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <FileText className="size-4 text-foreground/50 shrink-0" />
            <span className="text-foreground/90 font-medium truncate max-w-48">{doc.name}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "doc_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const type = row.getValue("doc_type") as DocType;
        return (
          <Badge variant="secondary" className="text-[11px] whitespace-nowrap bg-muted text-foreground border-border-default/40">
            {DOC_TYPE_LABELS[type] || type}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "case_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Case" />,
      cell: ({ row }) => {
        const caseNumber = row.original.cases?.case_number || "—";
        return <span className="font-mono text-[12px] text-text-secondary">{caseNumber}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "client_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
      cell: ({ row }) => {
        const clientName = row.original.clients?.name || "—";
        return <span className="text-text-secondary text-[12px]">{clientName}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "size_bytes",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
      cell: ({ row }) => {
        const bytes = row.getValue("size_bytes") as number | null;
        return <span className="text-text-secondary/70 text-[12px]">{formatSize(bytes)}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Uploaded" />,
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div>
            <p className="text-text-secondary/70 text-[11px]">{new Date(doc.created_at).toLocaleDateString("en-IN")}</p>
            <p className="text-text-secondary/50 text-[10px] mt-0.5">{doc.uploaded_by_name || doc.source}</p>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex items-center justify-end gap-3.5">
            <a
              href={`/view/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-foreground/70 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 font-semibold"
            >
              View
            </a>
            <button
              onClick={() => void triggerDownload(doc.id)}
              className="text-[11px] text-text-secondary/70 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 font-semibold cursor-pointer bg-transparent border-none outline-none"
            >
              Download
            </button>
            <button
              onClick={() => {
                setDocToDelete(doc);
                setDeleteDialogOpen(true);
              }}
              className="text-[11px] text-red-500/70 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 font-semibold cursor-pointer bg-transparent border-none outline-none"
            >
              Delete
            </button>
          </div>
        );
      },
      enableSorting: false,
    }
  ], []);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return docs.slice(start, start + ITEMS_PER_PAGE);
  }, [docs, currentPage]);

  const totalPages = Math.ceil(docs.length / ITEMS_PER_PAGE);

  const { table } = useDataTable({
    data: paginatedDocs,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <FolderOpen className="size-6 text-text-secondary" strokeWidth={1.5} />
            Documents
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">{docs.length} documents stored</p>
        </div>
        <button
          id="upload-doc-btn"
          onClick={() => setShowUpload((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl transition-colors cursor-pointer"
        >
          <Upload className="size-4" />
          Upload Document
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-surface border border-border-default rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-foreground/75">Upload New Document</h2>
            <button onClick={() => setShowUpload(false)} className="text-text-secondary hover:text-foreground cursor-pointer">
              <X className="size-4" />
            </button>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-red-400 text-sm">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2.5 bg-muted border border-border-default rounded-xl px-3.5 py-3 text-foreground/85 text-sm">
              <Check className="size-4 shrink-0 text-foreground" />
              Document uploaded successfully!
            </div>
          )}

          <form onSubmit={handleUpload} className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Case *</label>
              <select
                id="doc-case"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                required
                className="w-full bg-background border border-border-default rounded-xl px-3 py-2.5 text-sm text-foreground/80 outline-none focus:border-foreground/20 transition-colors"
              >
                <option value="" className="bg-background">Select case…</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id} className="bg-background">{c.case_number} — {c.clients?.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-text-secondary text-xs uppercase tracking-wider font-semibold">Document Type</label>
              <select
                id="doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="w-full bg-background border border-border-default rounded-xl px-3 py-2.5 text-sm text-foreground/80 outline-none focus:border-foreground/20 transition-colors"
              >
                {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((t) => (
                  <option key={t} value={t} className="bg-background">{DOC_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-text-secondary text-xs uppercase tracking-wider font-semibold">File *</label>
              <input
                id="doc-file"
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="w-full bg-muted border border-border-default rounded-xl px-3 py-2 text-sm text-foreground/75 outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-muted/80 file:text-foreground file:text-xs file:font-medium file:cursor-pointer"
              />
            </div>
            
            {uploading && (
              <div className="sm:col-span-3 space-y-1.5">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5 w-full bg-muted" />
              </div>
            )}

            <div className="sm:col-span-3">
              <button
                type="submit"
                id="upload-submit"
                disabled={uploading || !file || !selectedCaseId}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* State Rendering */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-red-500/[0.02] border border-red-500/10 rounded-3xl gap-4 max-w-md mx-auto my-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-red-400 font-semibold text-[15px]">Failed to Load Documents</h3>
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
              <div className="flex items-center gap-3 flex-1">
                <FileText className="size-4 text-text-secondary/40 shrink-0" />
                <Skeleton className="h-3.5 w-40" />
              </div>
              <div className="flex-1 flex gap-4 justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface border border-border-default rounded-3xl gap-4 max-w-md mx-auto my-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="size-14 rounded-2xl bg-muted border border-border-default flex items-center justify-center text-text-secondary shadow-inner">
            <FolderOpen className="size-6" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground/85 font-semibold text-[15px]">No Documents Found</h3>
            <p className="text-text-secondary text-xs leading-relaxed max-w-[280px]">No legal papers or ID proofs have been uploaded to workspace files.</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            + Upload Document
          </button>
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

      {/* Deletion Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border border-border-default max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &quot;{docToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <button
              onClick={() => {
                setDeleteDialogOpen(false);
                setDocToDelete(null);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border-default bg-transparent text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => docToDelete && void handleDelete(docToDelete.id)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
