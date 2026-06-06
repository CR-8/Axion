"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Loader2, AlertCircle, Download, ArrowLeft, Maximize } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/types";

export default function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<{
    name: string;
    url: string;
    mime_type: string | null;
    doc_type: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to load document.");
      }
      const data = await res.json();
      setDoc({
        name: data.name,
        url: data.url,
        mime_type: data.mime_type,
        doc_type: data.doc_type,
      });
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred while loading the document.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white/50 gap-3">
        <Loader2 className="size-8 animate-spin text-zinc-400" />
        <p className="text-sm font-medium">Loading document viewer...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
            <AlertCircle className="size-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Failed to Load Document</h2>
            <p className="text-white/35 text-sm leading-relaxed">{error || "Document not found."}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] border border-white/[0.09] hover:bg-white/[0.09] text-white/80 rounded-xl text-sm font-semibold transition-colors mx-auto"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-white select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] p-4 bg-[#0c0c0f]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-[14px] sm:text-[15px] truncate max-w-[200px] sm:max-w-md md:max-w-lg">{doc.name}</h1>
            <p className="text-white/35 text-[10px] mt-0.5 uppercase tracking-wider font-bold">
              {DOC_TYPE_LABELS[doc.doc_type as DocType] || doc.doc_type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open(doc.url, "_blank")}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white/90 hover:bg-white/[0.08] transition-all rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Download className="size-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden p-4 sm:p-6">
        {doc.mime_type?.startsWith("image/") ? (
          <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
            <img
              src={doc.url}
              alt={doc.name}
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-white/[0.05]"
            />
          </div>
        ) : doc.name.endsWith(".doc") || doc.name.endsWith(".docx") ? (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.url)}`}
            className="w-full h-full rounded-xl border border-white/[0.05]"
            frameBorder="0"
          />
        ) : doc.mime_type === "application/pdf" || doc.name.endsWith(".pdf") || doc.name.endsWith(".txt") ? (
          <iframe
            src={doc.url}
            className="w-full h-full rounded-xl border border-white/[0.05] bg-white/[0.01]"
            frameBorder="0"
          />
        ) : (
          <div className="text-center p-8 space-y-4 max-w-sm">
            <div className="size-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/30 mx-auto">
              <FileText className="size-8" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Preview Unavailable</h3>
              <p className="text-white/30 text-xs mt-1">
                This file type ({doc.mime_type || "unknown"}) cannot be previewed in the browser.
              </p>
            </div>
            <button
              onClick={() => {
                window.open(doc.url, "_blank");
              }}
              className="px-4 py-2 bg-white hover:bg-white/90 text-black font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Download to View
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
