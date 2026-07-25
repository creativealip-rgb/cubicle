"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  completePortalRequest,
  respondPortalRequest,
} from "@/lib/actions/portal-requests";
import {
  cleanPortalRequestDescription,
  partitionPortalRequests,
} from "@/lib/portal-presentation";

interface PortalRequest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  dueDate: string | null;
}

function parseDecision(
  description: string | null,
): "approved" | "rejected" | null {
  if (!description) return null;
  if (description.includes("[Client APPROVED")) return "approved";
  if (description.includes("[Client REJECTED")) return "rejected";
  return null;
}
const typeLabels: Record<string, string> = {
  document: "Dokumen",
  approval: "Persetujuan",
  info: "Informasi",
  other: "Lainnya",
};

export function PortalRequestList({
  requests,
  token,
}: {
  requests: PortalRequest[];
  token: string;
}) {
  const [items, setItems] = useState(requests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  async function markDone(id: string) {
    setLoadingId(id);
    try {
      await completePortalRequest({ token, requestId: id });
      setItems((p) =>
        p.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
      );
      toast.success("Request selesai");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setLoadingId(null);
    }
  }
  async function decide(id: string, decision: "approved" | "rejected") {
    setLoadingId(id);
    try {
      const row = await respondPortalRequest({
        token,
        requestId: id,
        decision,
        note: noteById[id] || null,
      });
      setItems((p) =>
        p.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "completed",
                description: row.description ?? r.description,
              }
            : r,
        ),
      );
      toast.success(
        decision === "approved" ? "Disetujui" : "Permintaan revisi dikirim",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setLoadingId(null);
    }
  }
  async function uploadFile(id: string, file?: File) {
    if (!file) return;
    setLoadingId(id);
    try {
      const form = new FormData();
      form.append("token", token);
      form.append("requestId", id);
      form.append("file", file);
      const res = await fetch("/api/client-portal/requests/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload gagal");
      setItems((p) =>
        p.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
      );
      toast.success("File berhasil diunggah");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setLoadingId(null);
      if (fileInputs.current[id]) fileInputs.current[id]!.value = "";
    }
  }
  if (!items.length)
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada request atau pengingat aktif.
      </p>
    );
  const { open, history } = partitionPortalRequests(items);
  const render = (request: PortalRequest) => {
    const done = request.status === "completed",
      decision = parseDecision(request.description),
      approval = request.type === "approval",
      description = cleanPortalRequestDescription(
        request.description?.replace(
          /\n\n---\n\[Client (APPROVED|REJECTED)[\s\S]*$/,
          "",
        ) ?? null,
      );
    return (
      <div
        key={request.id}
        className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-start"
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className={`mt-0.5 rounded-md p-2 ${decision === "rejected" ? "bg-red-50 text-red-600" : decision === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}
          >
            {decision === "approved" ? (
              <ThumbsUp className="h-4 w-4" />
            ) : decision === "rejected" ? (
              <XCircle className="h-4 w-4" />
            ) : done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                {request.title === "Request Meeting"
                  ? "Permintaan Pertemuan"
                  : request.title === "Request Report"
                    ? "Permintaan Laporan"
                    : request.title}
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {done
                  ? decision === "approved"
                    ? "Disetujui"
                    : decision === "rejected"
                      ? "Revisi diminta"
                      : "Selesai"
                  : (typeLabels[request.type] ?? request.type)}
              </span>
            </div>
            {description && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {request.dueDate && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Tenggat {request.dueDate}
              </p>
            )}
            {!done && approval && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={noteById[request.id] || ""}
                  onChange={(e) =>
                    setNoteById((p) => ({ ...p, [request.id]: e.target.value }))
                  }
                  placeholder="Catatan opsional atau detail revisi…"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-11 gap-1.5"
                    disabled={loadingId === request.id}
                    onClick={() => decide(request.id, "approved")}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Setujui
                  </Button>
                  <Button
                    className="min-h-11 gap-1.5 text-red-600"
                    variant="outline"
                    disabled={loadingId === request.id}
                    onClick={() => decide(request.id, "rejected")}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Minta revisi
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {!done && !approval && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            {request.type === "document" && (
              <>
                <input
                  ref={(n) => {
                    fileInputs.current[request.id] = n;
                  }}
                  type="file"
                  className="hidden"
                  onChange={(e) => uploadFile(request.id, e.target.files?.[0])}
                />
                <Button
                  className="min-h-11"
                  disabled={loadingId === request.id}
                  onClick={() => fileInputs.current[request.id]?.click()}
                >
                  Unggah file
                </Button>
              </>
            )}
            <Button
              className="min-h-11"
              variant="outline"
              disabled={loadingId === request.id}
              onClick={() => markDone(request.id)}
            >
              Tandai selesai
            </Button>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      {open.length ? (
        <div className="space-y-2">{open.map(render)}</div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Semua request sudah selesai.
        </p>
      )}
      {history.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed px-3 text-sm text-muted-foreground hover:bg-muted/30"
          >
            {showHistory ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Riwayat request ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">{history.map(render)}</div>
          )}
        </div>
      )}
    </div>
  );
}
