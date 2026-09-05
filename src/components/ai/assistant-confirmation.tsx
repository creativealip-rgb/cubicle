"use client";

import { useState } from "react";
import { Check, Copy, Loader2, UserPlus, FolderPlus, Receipt, Play, Clock, Sparkles } from "lucide-react";
import { type AssistantLang } from "@/lib/ai/ui-copy";

export type AssistantConfirmation =
  | {
      kind: "update_task_status";
      taskId: string;
      taskTitle: string;
      currentStatus: string;
      newStatus: string;
      reason: string | null;
    }
  | {
      kind: "draft_invoice_reminder";
      invoiceId: string;
      invoiceNumber: string;
      to: string | null;
      subject: string;
      body: string;
    }
  | {
      kind: "create_client";
      name: string;
      companyName?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  | {
      kind: "create_project";
      name: string;
      clientId: string;
      clientName: string;
      billingModel?: string;
      budget?: number;
      dueDate?: string;
    }
  | {
      kind: "create_invoice";
      clientId: string;
      clientName: string;
      projectId?: string;
      projectName?: string;
      dueDate: string;
      currency: string;
      items: Array<{ description: string; quantity: number; unitPrice: number }>;
      total: number;
    }
  | {
      kind: "create_task";
      title: string;
      description?: string | null;
      projectId?: string | null;
      projectName?: string | null;
      priority?: "low" | "medium" | "high" | "urgent";
      dueDate?: string | null;
    }
  | {
      kind: "start_timer";
      taskId?: string;
      taskTitle?: string;
      projectId?: string;
      projectName?: string;
      clientId?: string;
      clientName?: string;
      description?: string;
    };

export function AssistantConfirmationCard({
  conf,
  lang,
  onConfirm,
  onDismiss,
}: {
  conf: AssistantConfirmation;
  lang: AssistantLang;
  onConfirm: () => Promise<void> | void;
  onDismiss: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  async function copyDraft() {
    if (conf.kind !== "draft_invoice_reminder") return;
    await navigator.clipboard.writeText(`${conf.subject}\n\n${conf.body}`);
    setCopied(true);
  }

  const isId = lang === "id";

  const getTitle = () => {
    switch (conf.kind) {
      case "update_task_status":
        return isId ? "Konfirmasi Perubahan Status Tugas" : "Confirm Task Status Change";
      case "draft_invoice_reminder":
        return isId ? "Draf Pengingat Pembayaran Invoice" : "Draft Invoice Payment Reminder";
      case "create_client":
        return isId ? "Konfirmasi Tambah Klien Baru" : "Confirm New Client Creation";
      case "create_project":
        return isId ? "Konfirmasi Buat Proyek Baru" : "Confirm New Project Creation";
      case "create_invoice":
        return isId ? "Konfirmasi Penerbitan Invoice" : "Confirm Invoice Creation";
      case "create_task":
        return isId ? "Konfirmasi Buat Tugas Baru" : "Confirm New Task Creation";
      case "start_timer":
        return isId ? "Mulai Timer Pelacakan Waktu" : "Start Task Time Tracker";
    }
  };

  const getIcon = () => {
    switch (conf.kind) {
      case "update_task_status":
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case "draft_invoice_reminder":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "create_client":
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case "create_project":
        return <FolderPlus className="h-4 w-4 text-indigo-600" />;
      case "create_invoice":
        return <Receipt className="h-4 w-4 text-emerald-600" />;
      case "create_task":
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case "start_timer":
        return <Play className="h-4 w-4 text-primary fill-primary" />;
    }
  };

  const c = {
    confirmDraft: isId ? "✓ Simpan Pengingat" : "✓ Save Reminder",
  };

  const getConfirmText = () => {
    switch (conf.kind) {
      case "update_task_status":
        return isId ? "✓ Ubah Status" : "✓ Update Status";
      case "draft_invoice_reminder":
        return c.confirmDraft;
      case "create_client":
        return isId ? "✓ Buat Klien" : "✓ Create Client";
      case "create_project":
        return isId ? "✓ Buat Proyek" : "✓ Create Project";
      case "create_invoice":
        return isId ? "✓ Buat Invoice" : "✓ Create Invoice";
      case "create_task":
        return isId ? "✓ Buat Tugas" : "✓ Create Task";
      case "start_timer":
        return isId ? "✓ Mulai Timer" : "✓ Start Timer";
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-primary/20 bg-card p-4 text-xs text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 font-bold text-foreground">
        <div className="p-1.5 rounded-lg bg-primary/10">{getIcon()}</div>
        <h3>{getTitle()}</h3>
      </div>

      <div className="mt-3.5 space-y-2 text-xs">
        {conf.kind === "update_task_status" && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">{isId ? "Tugas:" : "Task:"}</dt>
            <dd className="font-semibold text-foreground">{conf.taskTitle}</dd>
            <dt className="text-muted-foreground">{isId ? "Status Awal:" : "Current Status:"}</dt>
            <dd className="font-medium text-slate-600 dark:text-slate-300">{conf.currentStatus}</dd>
            <dt className="text-muted-foreground">{isId ? "Status Baru:" : "New Status:"}</dt>
            <dd className="font-bold text-primary">{conf.newStatus}</dd>
            {conf.reason && (
              <>
                <dt className="text-muted-foreground">{isId ? "Alasan:" : "Reason:"}</dt>
                <dd className="text-muted-foreground italic">{conf.reason}</dd>
              </>
            )}
          </dl>
        )}

        {conf.kind === "draft_invoice_reminder" && (
          <dl className="space-y-2">
            <div>
              <dt className="text-muted-foreground">{isId ? "Nomor Invoice:" : "Invoice Number:"}</dt>
              <dd className="font-semibold text-foreground">{conf.invoiceNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{isId ? "Penerima:" : "Recipient:"}</dt>
              <dd className="font-medium text-foreground">{conf.to ?? (isId ? "Tidak ada email" : "No email")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{isId ? "Subjek:" : "Subject:"}</dt>
              <dd className="font-semibold text-foreground">{conf.subject}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{isId ? "Isi Pesan:" : "Body:"}</dt>
              <dd className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/80 bg-muted/30 p-2.5 font-mono text-[11px]">
                {conf.body}
              </dd>
            </div>
          </dl>
        )}

        {conf.kind === "create_client" && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">{isId ? "Nama Klien:" : "Client Name:"}</dt>
            <dd className="font-bold text-foreground">{conf.name}</dd>
            {conf.companyName && (
              <>
                <dt className="text-muted-foreground">{isId ? "Perusahaan:" : "Company:"}</dt>
                <dd className="font-medium text-foreground">{conf.companyName}</dd>
              </>
            )}
            {conf.email && (
              <>
                <dt className="text-muted-foreground">Email:</dt>
                <dd className="font-medium text-foreground">{conf.email}</dd>
              </>
            )}
            {conf.phone && (
              <>
                <dt className="text-muted-foreground">{isId ? "Telepon:" : "Phone:"}</dt>
                <dd className="font-medium text-foreground">{conf.phone}</dd>
              </>
            )}
          </dl>
        )}

        {conf.kind === "create_project" && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">{isId ? "Nama Proyek:" : "Project Name:"}</dt>
            <dd className="font-bold text-foreground">{conf.name}</dd>
            <dt className="text-muted-foreground">{isId ? "Klien:" : "Client:"}</dt>
            <dd className="font-semibold text-primary">{conf.clientName}</dd>
            {conf.billingModel && (
              <>
                <dt className="text-muted-foreground">{isId ? "Model Tagihan:" : "Billing Model:"}</dt>
                <dd className="font-medium uppercase text-muted-foreground text-[11px]">{conf.billingModel}</dd>
              </>
            )}
            {conf.budget != null && (
              <>
                <dt className="text-muted-foreground">{isId ? "Anggaran:" : "Budget:"}</dt>
                <dd className="font-semibold text-emerald-600">
                  {conf.budget.toLocaleString("id-ID")}
                </dd>
              </>
            )}
            {conf.dueDate && (
              <>
                <dt className="text-muted-foreground">{isId ? "Jatuh Tempo:" : "Due Date:"}</dt>
                <dd className="font-medium text-foreground">{conf.dueDate}</dd>
              </>
            )}
          </dl>
        )}

        {conf.kind === "create_invoice" && (
          <div className="space-y-2.5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">{isId ? "Klien:" : "Client:"}</dt>
              <dd className="font-bold text-foreground">{conf.clientName}</dd>
              {conf.projectName && (
                <>
                  <dt className="text-muted-foreground">{isId ? "Proyek:" : "Project:"}</dt>
                  <dd className="font-medium text-foreground">{conf.projectName}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{isId ? "Jatuh Tempo:" : "Due Date:"}</dt>
              <dd className="font-medium text-foreground">{conf.dueDate}</dd>
            </dl>

            <div className="rounded-xl border border-border/70 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left">{isId ? "Item Layanan" : "Item"}</th>
                    <th className="px-2 py-1.5 text-center">Qty</th>
                    <th className="px-2.5 py-1.5 text-right">{isId ? "Harga" : "Price"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {conf.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2.5 py-1.5 font-medium text-foreground">{item.description}</td>
                      <td className="px-2 py-1.5 text-center text-muted-foreground">{item.quantity}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-foreground">
                        {conf.currency} {(item.quantity * item.unitPrice).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t border-border/70 font-bold">
                  <tr>
                    <td colSpan={2} className="px-2.5 py-1.5 text-foreground">{isId ? "Total Tagihan" : "Total"}</td>
                    <td className="px-2.5 py-1.5 text-right text-emerald-600 text-xs">
                      {conf.currency} {conf.total.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {conf.kind === "create_task" && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">{isId ? "Judul Tugas:" : "Task Title:"}</dt>
            <dd className="font-bold text-foreground">{conf.title}</dd>
            {conf.projectName && (
              <>
                <dt className="text-muted-foreground">{isId ? "Proyek:" : "Project:"}</dt>
                <dd className="font-semibold text-primary">{conf.projectName}</dd>
              </>
            )}
            {conf.priority && (
              <>
                <dt className="text-muted-foreground">{isId ? "Prioritas:" : "Priority:"}</dt>
                <dd className="font-medium capitalize text-foreground">{conf.priority}</dd>
              </>
            )}
            {conf.dueDate && (
              <>
                <dt className="text-muted-foreground">{isId ? "Tenggat:" : "Due Date:"}</dt>
                <dd className="font-medium text-foreground">{conf.dueDate}</dd>
              </>
            )}
            {conf.description && (
              <>
                <dt className="text-muted-foreground">{isId ? "Deskripsi:" : "Description:"}</dt>
                <dd className="text-muted-foreground italic col-span-2 mt-1">{conf.description}</dd>
              </>
            )}
          </dl>
        )}

        {conf.kind === "start_timer" && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {conf.taskTitle && (
              <>
                <dt className="text-muted-foreground">{isId ? "Tugas:" : "Task:"}</dt>
                <dd className="font-bold text-primary">{conf.taskTitle}</dd>
              </>
            )}
            {conf.projectName && (
              <>
                <dt className="text-muted-foreground">{isId ? "Proyek:" : "Project:"}</dt>
                <dd className="font-medium text-foreground">{conf.projectName}</dd>
              </>
            )}
            {conf.clientName && (
              <>
                <dt className="text-muted-foreground">{isId ? "Klien:" : "Client:"}</dt>
                <dd className="font-medium text-foreground">{conf.clientName}</dd>
              </>
            )}
            {conf.description && (
              <>
                <dt className="text-muted-foreground">{isId ? "Aktivitas:" : "Activity:"}</dt>
                <dd className="text-foreground italic">{conf.description}</dd>
              </>
            )}
          </dl>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
        <button
          disabled={submitting}
          onClick={onDismiss}
          className="min-h-9 px-3 rounded-xl border border-border bg-background text-foreground font-semibold hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isId ? "Batal" : "Cancel"}
        </button>

        {conf.kind === "draft_invoice_reminder" && (
          <button
            disabled={submitting}
            onClick={copyDraft}
            className="min-h-9 px-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {isId ? "Salin Draf" : "Copy Draft"}
          </button>
        )}

        <button
          disabled={submitting}
          onClick={confirm}
          className="min-h-9 px-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : getConfirmText()}
        </button>
      </div>
    </div>
  );
}
