"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTicket, deleteTicket } from "@/lib/actions/support";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Circle,
  CircleDot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Trash2,
  Filter,
} from "lucide-react";

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

interface Props {
  tickets: Ticket[];
  counts: Record<string, number>;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  members: { id: string; name: string }[];
  createAction: (formData: FormData) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Circle className="h-3.5 w-3.5 text-blue-500" />,
  in_progress: <CircleDot className="h-3.5 w-3.5 text-amber-500" />,
  resolved: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  closed: <XCircle className="h-3.5 w-3.5 text-slate-400" />,
};

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  low: <ArrowDown className="h-3 w-3 text-slate-400" />,
  medium: <Minus className="h-3 w-3 text-blue-500" />,
  high: <ArrowUp className="h-3 w-3 text-amber-500" />,
  urgent: <AlertTriangle className="h-3 w-3 text-red-500" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Terbuka",
  in_progress: "Dikerjakan",
  resolved: "Selesai",
  closed: "Ditutup",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

export function SupportPageClient({ tickets, counts, clients, projects, members, createAction }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await updateTicket(ticketId, { status: status as "open" | "in_progress" | "resolved" | "closed" });
      toast.success("Status diperbarui");
      router.refresh();
    } catch {
      toast.error("Gagal memperbarui status");
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Hapus tiket ini?")) return;
    try {
      await deleteTicket(ticketId);
      toast.success("Tiket dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus tiket");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="app-page-title">Pusat Bantuan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola tiket bantuan dan pantau kendala.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tiket Baru
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["open", "in_progress", "resolved", "closed"] as const).map((status) => (
          <Card
            key={status}
            className={`cursor-pointer transition-colors ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              {STATUS_ICONS[status]}
              <div>
                <p className="text-2xl font-bold">{counts[status] || 0}</p>
                <p className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tiket Baru</CardTitle></CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Judul *</label>
                  <Input name="title" placeholder="Deskripsi singkat kendala" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Prioritas</label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Rendah</SelectItem>
                      <SelectItem value="medium">Sedang</SelectItem>
                      <SelectItem value="high">Tinggi</SelectItem>
                      <SelectItem value="urgent">Mendesak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Deskripsi</label>
                <Textarea name="description" rows={3} placeholder="Detail, langkah reproduksi, hasil yang diharapkan..." />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Ditugaskan ke</label>
                  <Select name="assigneeId" defaultValue="">
                    <SelectTrigger><SelectValue placeholder="Belum ditugaskan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Belum ditugaskan</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Klien</label>
                  <Select name="clientId" defaultValue="">
                    <SelectTrigger><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak ada</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Proyek</label>
                  <Select name="projectId" defaultValue="">
                    <SelectTrigger><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak ada</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Buat Tiket</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Prioritas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua prioritas</SelectItem>
            <SelectItem value="low">Rendah</SelectItem>
            <SelectItem value="medium">Sedang</SelectItem>
            <SelectItem value="high">Tinggi</SelectItem>
            <SelectItem value="urgent">Mendesak</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} tiket</span>
      </div>

      {/* Tickets list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Tidak ada tiket.</p>
            {tickets.length > 0 && (
              <Button variant="link" size="sm" onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); }}>
                Hapus filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => (
            <Card key={ticket.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="mt-0.5 shrink-0">
                  {STATUS_ICONS[ticket.status]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{ticket.title}</span>
                    <Badge className={`text-[10px] gap-0.5 ${PRIORITY_COLORS[ticket.priority]}`}>
                      {PRIORITY_ICONS[ticket.priority]}
                      {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </Badge>
                  </div>
                  {ticket.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {ticket.assigneeName && <span>→ {ticket.assigneeName}</span>}
                    {ticket.clientName && <span>👤 {ticket.clientName}</span>}
                    {ticket.projectName && <span>📁 {ticket.projectName}</span>}
                    <span>{new Date(ticket.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Select value={ticket.status} onValueChange={(v) => handleStatusChange(ticket.id, v)}>
                    <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Terbuka</SelectItem>
                      <SelectItem value="in_progress">Dikerjakan</SelectItem>
                      <SelectItem value="resolved">Selesai</SelectItem>
                      <SelectItem value="closed">Ditutup</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(ticket.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
