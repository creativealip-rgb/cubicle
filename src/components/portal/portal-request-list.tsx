"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileText, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { completePortalRequest, respondPortalRequest } from "@/lib/actions/portal-requests";

interface PortalRequest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  dueDate: string | null;
}

function parseDecision(description: string | null): "approved" | "rejected" | null {
  if (!description) return null;
  if (description.includes("[Client APPROVED")) return "approved";
  if (description.includes("[Client REJECTED")) return "rejected";
  return null;
}

export function PortalRequestList({ requests, token }: { requests: PortalRequest[]; token: string }) {
  const [items, setItems] = useState(requests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function markDone(requestId: string) {
    setLoadingId(requestId);
    try {
      await completePortalRequest({ token, requestId });
      setItems((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "completed" } : r)));
      toast.success("Request marked done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoadingId(null);
    }
  }

  async function decide(requestId: string, decision: "approved" | "rejected") {
    setLoadingId(requestId);
    try {
      const row = await respondPortalRequest({
        token,
        requestId,
        decision,
        note: noteById[requestId] || null,
      });
      setItems((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: "completed", description: row.description ?? r.description }
            : r,
        ),
      );
      toast.success(decision === "approved" ? "Approved" : "Rejected — change requested");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoadingId(null);
    }
  }

  async function uploadFile(requestId: string, file?: File) {
    if (!file) return;
    setLoadingId(requestId);
    try {
      const form = new FormData();
      form.append("token", token);
      form.append("requestId", requestId);
      form.append("file", file);
      const res = await fetch("/api/client-portal/requests/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setItems((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "completed" } : r)));
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoadingId(null);
      const input = fileInputs.current[requestId];
      if (input) input.value = "";
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No document requests or reminders right now.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((request) => {
        const done = request.status === "completed";
        const decision = parseDecision(request.description);
        const isApproval = request.type === "approval";
        return (
          <div key={request.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
            <div
              className={`mt-0.5 rounded-md p-2 ${
                decision === "approved"
                  ? "bg-emerald-50 text-emerald-600"
                  : decision === "rejected"
                    ? "bg-red-50 text-red-600"
                    : done
                      ? "bg-blue-50 text-blue-600"
                      : "bg-blue-50 text-blue-600"
              }`}
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
                <p className="text-sm font-medium">{request.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">
                  {request.type}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">
                  {decision ?? request.status}
                </span>
              </div>
              {request.description && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {request.description.replace(/\n\n---\n\[Client (APPROVED|REJECTED)[\s\S]*$/, "")}
                </p>
              )}
              {request.dueDate && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Due {request.dueDate}
                </p>
              )}
              {!done && isApproval && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={noteById[request.id] || ""}
                    onChange={(e) =>
                      setNoteById((prev) => ({ ...prev, [request.id]: e.target.value }))
                    }
                    placeholder="Optional note / change request…"
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={loadingId === request.id}
                      onClick={() => decide(request.id, "approved")}
                      className="gap-1.5"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {loadingId === request.id ? "Saving…" : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === request.id}
                      onClick={() => decide(request.id, "rejected")}
                      className="gap-1.5 text-red-600"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Request changes
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {!done && !isApproval && (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {request.type === "document" && (
                  <>
                    <input
                      ref={(node) => {
                        fileInputs.current[request.id] = node;
                      }}
                      type="file"
                      className="hidden"
                      onChange={(e) => uploadFile(request.id, e.target.files?.[0])}
                    />
                    <Button
                      size="sm"
                      disabled={loadingId === request.id}
                      onClick={() => fileInputs.current[request.id]?.click()}
                    >
                      {loadingId === request.id ? "Uploading..." : "Upload file"}
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingId === request.id}
                  onClick={() => markDone(request.id)}
                >
                  {loadingId === request.id ? "Saving..." : "Mark done"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
