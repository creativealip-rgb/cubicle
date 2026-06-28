"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completePortalRequest } from "@/lib/actions/portal-requests";

interface PortalRequest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  dueDate: string | null;
}

export function PortalRequestList({ requests, token }: { requests: PortalRequest[]; token: string }) {
  const [items, setItems] = useState(requests);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function markDone(requestId: string) {
    setLoadingId(requestId);
    try {
      await completePortalRequest({ token, requestId });
      setItems((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "completed" } : r));
      toast.success("Reminder marked done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No document requests or reminders right now.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((request) => {
        const done = request.status === "completed";
        return (
          <div key={request.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
            <div className="mt-0.5 rounded-md bg-blue-50 p-2 text-blue-600">
              {done ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-sm">{request.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">{request.type}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">{request.status}</span>
              </div>
              {request.description && <p className="mt-1 text-sm text-muted-foreground">{request.description}</p>}
              {request.dueDate && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Due {request.dueDate}
                </p>
              )}
            </div>
            {!done && (
              <Button size="sm" variant="outline" disabled={loadingId === request.id} onClick={() => markDone(request.id)}>
                {loadingId === request.id ? "Saving..." : "Mark done"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
