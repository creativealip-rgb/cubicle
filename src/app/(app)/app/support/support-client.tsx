"use client";

import { useRef, useState, useTransition } from "react";
import { useT } from "@/lib/i18n-client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { updateTicket, deleteTicket } from "@/lib/actions/support";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import {
  LifeBuoy,
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
  Search,
  BookOpen,
  Mail,
  HelpCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  category: string;
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
  open: <Circle className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />,
  in_progress: <CircleDot className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20 animate-pulse" />,
  resolved: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  closed: <XCircle className="h-3.5 w-3.5 text-slate-400" />,
};

const PRIORITY_BADGE_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  low: {
    bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <ArrowDown className="h-3 w-3 text-slate-400" />,
  },
  medium: {
    bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    icon: <Minus className="h-3 w-3 text-blue-500" />,
  },
  high: {
    bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    icon: <ArrowUp className="h-3 w-3 text-amber-500" />,
  },
  urgent: {
    bg: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    icon: <AlertTriangle className="h-3 w-3 text-red-500" />,
  },
};

const CATEGORY_MAP: Record<string, { labelEn: string; labelId: string; color: string }> = {
  features: {
    labelEn: "Cubiqlo Features",
    labelId: "Fitur Cubiqlo",
    color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50",
  },
  free_plan_pricing: {
    labelEn: "Free Plan & Pricing",
    labelId: "Paket Gratis & Harga",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  },
  account: {
    labelEn: "Account",
    labelId: "Akun",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
  },
  workspace: {
    labelEn: "Workspace",
    labelId: "Workspace",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50",
  },
  subscription: {
    labelEn: "Subscription",
    labelId: "Langganan",
    color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50",
  },
  billing: {
    labelEn: "Billing",
    labelId: "Tagihan & Pembayaran",
    color: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50",
  },
  security_privacy: {
    labelEn: "Security & Privacy",
    labelId: "Keamanan & Privasi",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  },
  technical: {
    labelEn: "Technical Support",
    labelId: "Bantuan Teknis",
    color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50",
  },
  general: {
    labelEn: "General Questions",
    labelId: "Pertanyaan Umum",
    color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export function SupportPageClient({ tickets, counts, clients, projects, members, createAction }: Props) {
  const { t, locale } = useT();
  const { refresh } = useAppTransition();
  const [showCreate, setShowCreate] = useState(false);
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);

  function openCreate(event: React.MouseEvent<HTMLButtonElement>) {
    createTriggerRef.current = event.currentTarget;
    setShowCreate(true);
  }

  function restoreCreateFocus(event: Event) {
    event.preventDefault();
    createTriggerRef.current?.focus();
  }
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Screenshot upload state
  const [uploadedScreenshotUrl, setUploadedScreenshotUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("Ukuran file maksimal 5MB", "Maximum file size is 5MB"));
      return;
    }

    try {
      setUploadingScreenshot(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/site/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("Gagal mengunggah gambar", "Failed to upload image"));
      }

      const data = await res.json();
      setUploadedScreenshotUrl(data.url);
      setUploadedFileName(file.name);
      toast.success(t("Screenshot berhasil diunggah", "Screenshot uploaded successfully"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengunggah gambar", "Failed to upload image"));
    } finally {
      setUploadingScreenshot(false);
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "open":
        return t("Terbuka", "Open");
      case "in_progress":
        return t("Dikerjakan", "In Progress");
      case "resolved":
        return t("Selesai", "Resolved");
      case "closed":
        return t("Ditutup", "Closed");
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case "low":
        return t("Rendah", "Low");
      case "medium":
        return t("Sedang", "Medium");
      case "high":
        return t("Tinggi", "High");
      case "urgent":
        return t("Mendesak", "Urgent");
      default:
        return priority;
    }
  };

  const filtered = tickets.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ticket.title.toLowerCase().includes(q);
      const matchDesc = ticket.description?.toLowerCase().includes(q);
      const matchClient = ticket.clientName?.toLowerCase().includes(q);
      const matchProject = ticket.projectName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchClient && !matchProject) return false;
    }
    return true;
  });

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await updateTicket(ticketId, { status: status as "open" | "in_progress" | "resolved" | "closed" });
      toast.success(t("Status tiket berhasil diperbarui", "Ticket status updated successfully"));
      refresh();
    } catch {
      toast.error(t("Gagal memperbarui status", "Failed to update status"));
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm(t("Yakin ingin menghapus tiket ini?", "Are you sure you want to delete this ticket?"))) return;
    try {
      await deleteTicket(ticketId);
      toast.success(t("Tiket berhasil dihapus", "Ticket deleted successfully"));
      refresh();
    } catch {
      toast.error(t("Gagal menghapus tiket", "Failed to delete ticket"));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Standard Gradient Page Header */}
      <PageHeader
        icon={LifeBuoy}
        title={t("Pusat Bantuan & Dukungan", "Help & Support Center")}
        description={t(
          "Kelola tiket kendala, pantau progres penanganan masalah, dan akses dokumentasi panduan.",
          "Manage support tickets, track issue resolutions, and access operational guidebooks."
        )}
        actions={
          <Button
            onClick={openCreate}
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Tiket Baru", "New Ticket")}
          </Button>
        }
      />

      {/* 2. Compact 4-KPI Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(["open", "in_progress", "resolved", "closed"] as const).map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(isActive ? "all" : status)}
              className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all shadow-2xs ${
                isActive
                  ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                  : "border-border bg-card hover:border-border/80 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                  {STATUS_ICONS[status]}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground truncate">{getStatusLabel(status)}</p>
                  <p className="text-base sm:text-lg font-bold tracking-tight text-card-foreground">
                    {counts[status] || 0}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t("Cari tiket dukungan", "Search support tickets")}
              placeholder={t("Cari judul, klien, atau projek...", "Search title, client, or project...")}
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg">
              <Filter className="mr-1.5 h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder={t("Prioritas", "Priority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Semua Prioritas", "All Priorities")}</SelectItem>
              <SelectItem value="low">{t("Rendah", "Low")}</SelectItem>
              <SelectItem value="medium">{t("Sedang", "Medium")}</SelectItem>
              <SelectItem value="high">{t("Tinggi", "High")}</SelectItem>
              <SelectItem value="urgent">{t("Mendesak", "Urgent")}</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || priorityFilter !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setSearchQuery("");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("Reset", "Reset")}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {filtered.length} {t("tiket ditemukan", "tickets found")}
        </div>
      </div>

      {/* 4. Desktop Ultra-Compact Linear Table & Mobile Adaptive Cards */}
      {filtered.length === 0 ? (
        <Card className="rounded-xl border border-dashed border-border bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
              <HelpCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-card-foreground">
              {t("Belum ada tiket bantuan", "No support tickets found")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {t(
                "Buat tiket baru jika ada kendala sistem atau pertanyaan teknis untuk ditindaklanjuti.",
                "Create a new ticket if you encounter any technical issues or need follow-ups."
              )}
            </p>
            <Button
              onClick={openCreate}
              size="sm"
              className="mt-4 h-8 gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("Buat Tiket Pertama", "Create First Ticket")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3.5 py-2.5">{t("Status & Tiket", "Status & Ticket")}</th>
                  <th className="px-3.5 py-2.5">{t("Klien / Projek", "Client / Project")}</th>
                  <th className="px-3.5 py-2.5">{t("Prioritas", "Priority")}</th>
                  <th className="px-3.5 py-2.5">{t("Petugas", "Assignee")}</th>
                  <th className="px-3.5 py-2.5">{t("Dibuat", "Created")}</th>
                  <th className="px-3.5 py-2.5 text-right">{t("Aksi", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ticket) => {
                  const pMeta = PRIORITY_BADGE_STYLES[ticket.priority] || PRIORITY_BADGE_STYLES.medium;
                  return (
                    <tr key={ticket.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="shrink-0">{STATUS_ICONS[ticket.status]}</div>
                          <div className="min-w-0 max-w-md">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-card-foreground truncate">{ticket.title}</p>
                              {(() => {
                                const cat = CATEGORY_MAP[ticket.category] || CATEGORY_MAP.technical;
                                return (
                                  <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded border ${cat.color} shrink-0`}>
                                    <span>{locale === "id" ? cat.labelId : cat.labelEn}</span>
                                  </span>
                                );
                              })()}
                            </div>
                            {ticket.description && (
                              <p className="text-[11px] text-muted-foreground truncate">{ticket.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="text-muted-foreground truncate">
                          {ticket.clientName ? <span className="font-medium text-foreground">{ticket.clientName}</span> : "—"}
                          {ticket.projectName && <span className="text-[11px] block text-muted-foreground">📁 {ticket.projectName}</span>}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${pMeta.bg}`}>
                          {pMeta.icon}
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="text-muted-foreground truncate">
                          {ticket.assigneeName ? `👤 ${ticket.assigneeName}` : "—"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Select value={ticket.status} onValueChange={(v) => handleStatusChange(ticket.id, v)}>
                            <SelectTrigger className="h-7 w-[105px] text-[11px] rounded-md px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">{t("Terbuka", "Open")}</SelectItem>
                              <SelectItem value="in_progress">{t("Dikerjakan", "In Progress")}</SelectItem>
                              <SelectItem value="resolved">{t("Selesai", "Resolved")}</SelectItem>
                              <SelectItem value="closed">{t("Ditutup", "Closed")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(ticket.id)}
                            title={t("Hapus tiket", "Delete ticket")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Adaptive Cards View */}
          <div className="grid gap-2.5 md:hidden">
            {filtered.map((ticket) => {
              const pMeta = PRIORITY_BADGE_STYLES[ticket.priority] || PRIORITY_BADGE_STYLES.medium;
              return (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {STATUS_ICONS[ticket.status]}
                      <p className="font-semibold text-sm text-card-foreground truncate">{ticket.title}</p>
                    </div>
                    {(() => {
                      const cat = CATEGORY_MAP[ticket.category] || CATEGORY_MAP.technical;
                      return (
                        <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cat.color} shrink-0`}>
                          <span>{locale === "id" ? cat.labelId : cat.labelEn}</span>
                        </span>
                      );
                    })()}
                  </div>

                  {ticket.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${pMeta.bg}`}>
                      {pMeta.icon}
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    {ticket.clientName && <span>👤 {ticket.clientName}</span>}
                    {ticket.projectName && <span>📁 {ticket.projectName}</span>}
                    {ticket.assigneeName && <span>→ {ticket.assigneeName}</span>}
                    <span>{new Date(ticket.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Select value={ticket.status} onValueChange={(v) => handleStatusChange(ticket.id, v)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs rounded-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t("Terbuka", "Open")}</SelectItem>
                        <SelectItem value="in_progress">{t("Dikerjakan", "In Progress")}</SelectItem>
                        <SelectItem value="resolved">{t("Selesai", "Resolved")}</SelectItem>
                        <SelectItem value="closed">{t("Ditutup", "Closed")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
                      onClick={() => handleDelete(ticket.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("Hapus", "Delete")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 5. Feature Guides Documentation Hub Card */}
      <div className="pt-2">
        <div className="flex items-center justify-between gap-3.5 rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-card-foreground">
                {t("Feature Guides Documentation Hub", "Feature Guides Documentation Hub")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("Panduan langkah demi langkah modul invoice, project, time tracking, dan portal klien.", "Step-by-step guides for invoices, projects, time tracking, and client portal.")}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold text-primary gap-1.5 shrink-0 rounded-lg">
            <Link href="/app/docs">
              {t("Buka Dokumentasi", "Open Guides")} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Modal Dialog: New Ticket Creation */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onCloseAutoFocus={restoreCreateFocus} className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" />
              {t("Buat Tiket Bantuan Baru", "Create New Support Ticket")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("Sampaikan kendala atau permintaan bantuan teknis ke tim.", "Submit your technical issue or support request.")}
            </DialogDescription>
          </DialogHeader>

          <form
            aria-busy={isPending}
            action={(formData) => {
              startTransition(async () => {
                try {
                  await createAction(formData);
                  setShowCreate(false);
                  toast.success(t("Tiket berhasil dibuat", "Ticket created successfully"));
                } catch {
                  toast.error(t("Gagal membuat tiket", "Failed to create ticket"));
                }
              });
            }}
            className="space-y-3.5 pt-1"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t("Apa yang Anda butuhkan bantuan? *", "What do you need help with? *")}
              </label>
              <Select name="category" defaultValue="features">
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder={t("Pilih kategori bantuan ▾", "Select a support category ▾")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="features">{t("Fitur Cubiqlo", "Cubiqlo Features")}</SelectItem>
                  <SelectItem value="free_plan_pricing">{t("Paket Gratis & Harga", "Free Plan & Pricing")}</SelectItem>
                  <SelectItem value="account">{t("Akun", "Account")}</SelectItem>
                  <SelectItem value="workspace">{t("Workspace", "Workspace")}</SelectItem>
                  <SelectItem value="subscription">{t("Langganan", "Subscription")}</SelectItem>
                  <SelectItem value="billing">{t("Tagihan & Pembayaran", "Billing")}</SelectItem>
                  <SelectItem value="security_privacy">{t("Keamanan & Privasi", "Security & Privacy")}</SelectItem>
                  <SelectItem value="technical">{t("Bantuan Teknis", "Technical Support")}</SelectItem>
                  <SelectItem value="general">{t("Pertanyaan Umum", "General Questions")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Prioritas", "Priority")}</label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("Rendah", "Low")}</SelectItem>
                  <SelectItem value="medium">{t("Sedang", "Medium")}</SelectItem>
                  <SelectItem value="high">{t("Tinggi", "High")}</SelectItem>
                  <SelectItem value="urgent">{t("Mendesak", "Urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{t("Judul Kendala *", "Title *")}</label>
              <Input
                name="title"
                placeholder={t("Contoh: Gagal upload lampiran invoice", "e.g., Cannot upload invoice attachment")}
                required
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t("Jelaskan masalah Anda secara rinci.", "Describe your issue in detail.")}
              </label>
              <Textarea
                name="description"
                rows={3}
                placeholder={t(
                  "Jelaskan detail kendala, URL halaman terkait, dan langkah memicunya...",
                  "Explain the issue details, related URL, and steps to reproduce..."
                )}
                className="text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t("Upload a screenshot of the issue (optional)", "Upload a screenshot of the issue (optional)")}
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />
              <input
                type="hidden"
                name="screenshotUrl"
                value={uploadedScreenshotUrl}
              />
              
              {uploadedScreenshotUrl ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/80 bg-muted/30 text-xs w-full max-w-full min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium text-foreground">{uploadedFileName || t("Screenshot Terlampir", "Attached Screenshot")}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => {
                      setUploadedScreenshotUrl("");
                      setUploadedFileName("");
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors text-center"
                >
                  {uploadingScreenshot ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>{t("Mengunggah gambar...", "Uploading screenshot...")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t("Pilih gambar dari perangkat (PNG, JPG, WebP)", "Choose local image file (PNG, JPG, WebP)")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreate(false)}
                className="h-8 text-xs rounded-lg"
              >
                {t("Batal", "Cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="h-8 gap-1.5 text-xs font-semibold rounded-lg">
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {t("Simpan Tiket", "Save Ticket")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
