"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  Loader2,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRecurring,
  updateRecurring,
  deleteRecurring,
  generateFromRecurring,
} from "@/lib/actions/recurring";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import type { CategoryOption, ProjectOption } from "./expense-form";

export interface RecurringRow {
  id: string;
  name: string;
  amount: string;
  currency: string;
  /** Converted amount in workspace base currency (null if rate missing / toggle off). */
  amountBase?: number | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  projectId: string | null;
  projectName: string | null;
  frequency: "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string | null;
  lastGeneratedDate: string | null;
  isActive: boolean;
  notes: string | null;
}

const NONE = "__none__";
const CURRENCIES = ["IDR", "USD", "EUR", "SGD"];

interface RecurringManagerProps {
  workspaceId: string;
  rows: RecurringRow[];
  categories: CategoryOption[];
  projects: ProjectOption[];
  canWrite: boolean;
  defaultCurrency: string;
  /** Workspace base currency for secondary ≈ line. */
  baseCurrency?: string;
}

interface FormState {
  name: string;
  amount: string;
  currency: string;
  categoryId: string;
  projectId: string;
  frequency: "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string;
  notes: string;
}

const emptyForm = (currency: string): FormState => ({
  name: "",
  amount: "",
  currency,
  categoryId: "",
  projectId: "",
  frequency: "monthly",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  notes: "",
});

export function RecurringManager({
  workspaceId,
  rows,
  categories,
  projects,
  canWrite,
  defaultCurrency,
  baseCurrency,
}: RecurringManagerProps) {
  const router = useRouter();
  const { t } = useT();
  const base = (baseCurrency || defaultCurrency || "IDR").toUpperCase();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [genId, setGenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(defaultCurrency));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(defaultCurrency));
    setOpen(true);
  }

  function openEdit(r: RecurringRow) {
    setEditing(r);
    setForm({
      name: r.name,
      amount: r.amount,
      currency: r.currency,
      categoryId: r.categoryId ?? "",
      projectId: r.projectId ?? "",
      frequency: r.frequency,
      startDate: r.startDate,
      endDate: r.endDate ?? "",
      notes: r.notes ?? "",
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || parseFloat(form.amount) <= 0) {
      toast.error(t("Nama dan jumlah wajib", "Name and amount required"));
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await updateRecurring(editing.id, {
          name: form.name.trim(),
          amount: parseFloat(form.amount),
          currency: form.currency,
          categoryId: form.categoryId || null,
          projectId: form.projectId || null,
          frequency: form.frequency,
          endDate: form.endDate || null,
          notes: form.notes.trim() || null,
        });
        toast.success(t("Rutin diperbarui", "Recurring updated"));
      } else {
        await createRecurring({
          workspaceId,
          name: form.name.trim(),
          amount: parseFloat(form.amount),
          currency: form.currency,
          categoryId: form.categoryId || null,
          projectId: form.projectId || null,
          frequency: form.frequency,
          startDate: form.startDate,
          endDate: form.endDate || null,
          notes: form.notes.trim() || null,
        });
        toast.success(t("Pengeluaran rutin ditambahkan", "Recurring expense added"));
      }
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deleteRecurring(deleteTarget.id);
      toast.success(t("Rutin dihapus", "Recurring deleted"));
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(r: RecurringRow) {
    try {
      await updateRecurring(r.id, { isActive: !r.isActive });
      toast.success(
        r.isActive
          ? t("Rutin dijeda", "Recurring paused")
          : t("Rutin diaktifkan", "Recurring resumed"),
      );
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    }
  }

  async function handleGenerate(r: RecurringRow) {
    setGenId(r.id);
    try {
      await generateFromRecurring(r.id);
      toast.success(t("Pengeluaran digenerate", "Expense generated"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setGenId(null);
    }
  }

  const freqLabel = (f: string) => {
    if (f === "monthly") return t("Bulanan", "Monthly");
    if (f === "quarterly") return t("Kuartalan", "Quarterly");
    return t("Tahunan", "Yearly");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Repeat className="h-4 w-4" />
          {t("Pengeluaran rutin", "Recurring expenses")}
          <span className="text-xs text-slate-500 font-normal">({rows.length})</span>
        </div>
        {canWrite && (
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            {t("Tambah", "Add")}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          {t(
            "Belum ada pengeluaran rutin. Tambah hostingan, sewa, langganan, dll.",
            "No recurring expenses yet. Add hosting, rent, subscriptions, etc.",
          )}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${
                r.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{r.name}</span>
                  {!r.isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-slate-500 bg-slate-200 rounded px-1.5 py-0.5">
                      {t("Jeda", "Paused")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="tabular-nums font-medium text-slate-700">
                    {formatMoney(r.amount, r.currency)}
                    {r.amountBase != null &&
                      r.currency?.toUpperCase() !== base && (
                        <span className="ml-1 font-normal text-muted-foreground">
                          ≈ {formatMoney(r.amountBase, base)}
                        </span>
                      )}
                  </span>
                  <span>· {freqLabel(r.frequency)}</span>
                  {r.categoryName && (
                    <span className="inline-flex items-center gap-1">
                      ·
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: r.categoryColor ?? "#64748b" }}
                      />
                      {r.categoryName}
                    </span>
                  )}
                  {r.projectName && <span>· {r.projectName}</span>}
                  {r.lastGeneratedDate && (
                    <span>
                      · {t("terakhir", "last")} {r.lastGeneratedDate}
                    </span>
                  )}
                </div>
              </div>
              {canWrite && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                    title={t("Generate sekarang", "Generate now")}
                    disabled={!r.isActive || genId === r.id}
                    onClick={() => handleGenerate(r)}
                  >
                    {genId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                    title={r.isActive ? t("Jeda", "Pause") : t("Aktifkan", "Resume")}
                    onClick={() => toggleActive(r)}
                  >
                    {r.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                    onClick={() => setDeleteTarget(r)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("Edit pengeluaran rutin", "Edit recurring expense")
                : t("Tambah pengeluaran rutin", "Add recurring expense")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("Nama", "Name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("e.g. VPS Hosting", "e.g. VPS Hosting")}
                className="h-9"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("Jumlah", "Amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="h-9"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("Mata uang", "Currency")}</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("Frekuensi", "Frequency")}</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) =>
                    setForm({ ...form, frequency: v as FormState["frequency"] })
                  }
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("Bulanan", "Monthly")}</SelectItem>
                    <SelectItem value="quarterly">{t("Kuartalan", "Quarterly")}</SelectItem>
                    <SelectItem value="yearly">{t("Tahunan", "Yearly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("Mulai", "Start")}</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-9"
                  required
                  disabled={!!editing}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("Kategori", "Category")}</Label>
                <Select
                  value={form.categoryId || NONE}
                  onValueChange={(v) => setForm({ ...form, categoryId: v === NONE ? "" : v })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("Tanpa kategori", "No category")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("Proyek", "Project")}</Label>
                <Select
                  value={form.projectId || NONE}
                  onValueChange={(v) => setForm({ ...form, projectId: v === NONE ? "" : v })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("Tidak ada", "None")}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Berakhir (opsional)", "End date (optional)")}</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Catatan", "Notes")}</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="h-9"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
                {t("Batal", "Cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {t("Simpan", "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Hapus rutin?", "Delete recurring?")}</DialogTitle>
            <DialogDescription>
              {t(
                `"${deleteTarget?.name ?? ""}" dihapus. Riwayat pengeluaran yang sudah digenerate tetap ada.`,
                `"${deleteTarget?.name ?? ""}" will be deleted. Already generated expenses stay.`,
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)} disabled={loading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={loading}>
              {loading ? t("Menghapus...", "Deleting...") : t("Hapus", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
