"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RequestRow = {
  id: string;
  title: string;
  description: string | null;
  type: "document" | "approval" | "info" | "other";
  status: string;
  dueDate: string | null;
  projectId: string | null;
};

type ProjectOption = { id: string; name: string };

export function PortalRequestAdmin({
  clientId,
  initialRequests,
  projects,
}: {
  clientId: string;
  initialRequests: RequestRow[];
  projects: ProjectOption[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "document" as RequestRow["type"],
    dueDate: "",
    projectId: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/portal-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        clientId,
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        dueDate: form.dueDate || undefined,
        projectId: form.projectId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const row = data.row;
      setRequests((prev) => [row as RequestRow, ...prev]);
      setForm({ title: "", description: "", type: "document", dueDate: "", projectId: "" });
      toast.success("Portal request dibuat");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(requestId: string, status: "pending" | "completed" | "cancelled") {
    setLoading(true);
    try {
      const res = await fetch("/api/portal-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status } : r));
      toast.success(`Request ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request-title">Title</Label>
            <Input id="request-title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Kirim logo / approve desain" required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as RequestRow["type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={form.projectId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due-date">Due date</Label>
            <Input id="due-date" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="request-description">Description</Label>
          <Textarea id="request-description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detail instruksi untuk klien..." />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Add request"}</Button>
      </form>

      <div className="space-y-2">
        {requests.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No portal requests yet</p>
        )}
        {requests.map((request) => {
          const decision = request.description?.includes("[Client APPROVED")
            ? "approved"
            : request.description?.includes("[Client REJECTED")
              ? "rejected"
              : null;
          const fromClient =
            request.description?.includes("[CLIENT_ORIGIN report]") ||
            request.description?.includes("[CLIENT_ORIGIN meeting]");
          const cleanDesc = (request.description || "")
            .replace(/\n\n---\n\[Client (APPROVED|REJECTED)[\s\S]*$/, "")
            .replace(/^\[CLIENT_ORIGIN (report|meeting)\]\n?/, "");
          return (
            <div key={request.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{request.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
                    {request.type}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
                    {request.status}
                  </span>
                  {fromClient && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      From client
                    </span>
                  )}
                  {decision === "approved" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Client approved
                    </span>
                  )}
                  {decision === "rejected" && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Changes requested
                    </span>
                  )}
                </div>
                {cleanDesc && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{cleanDesc}</p>}
                {decision && request.description?.includes("Client note:") && (
                  <p className="mt-1 text-xs text-amber-700">
                    {request.description
                      .split("Client note:")
                      .slice(1)
                      .join("Client note:")
                      .trim()
                      .split("\n")[0]}
                  </p>
                )}
                {request.dueDate && (
                  <p className="mt-1 text-xs text-muted-foreground">Due {request.dueDate}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {request.status !== "completed" && (
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus(request.id, "completed")}>
                    Mark done
                  </Button>
                )}
                {request.status !== "cancelled" && (
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus(request.id, "cancelled")}>
                    Cancel
                  </Button>
                )}
                {request.status !== "pending" && (
                  <Button size="sm" variant="ghost" disabled={loading} onClick={() => updateStatus(request.id, "pending")}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
