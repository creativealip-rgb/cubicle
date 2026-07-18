"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export interface CategoryOption {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface ClientOption {
  id: string;
  name: string;
}

export interface ExpenseFormValues {
  id?: string;
  date: string;
  amount: string;
  currency: string;
  description: string;
  categoryId: string;
  projectId: string;
  clientId: string;
  vendor: string;
  taxIncluded: boolean;
  taxAmount: string;
  receiptUrl: string | null;
}

interface ExpenseFormProps {
  workspaceId: string;
  defaultCurrency: string;
  categories: CategoryOption[];
  projects: ProjectOption[];
  clients: ClientOption[];
  initial?: Partial<ExpenseFormValues> & { id?: string };
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
  mode?: "create" | "edit";
}

const NONE = "__none__";
const CURRENCIES = ["IDR", "USD", "EUR", "SGD"];

export function ExpenseForm({
  workspaceId,
  defaultCurrency,
  categories,
  projects,
  clients,
  initial,
  onSuccess,
  onCancel,
  compact = false,
  mode = "create",
}: ExpenseFormProps) {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(mode === "edit" || !compact);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ExpenseFormValues>({
    date: initial?.date ?? new Date().toISOString().split("T")[0],
    amount: initial?.amount ?? "",
    currency: initial?.currency ?? defaultCurrency,
    description: initial?.description ?? "",
    categoryId: initial?.categoryId ?? "",
    projectId: initial?.projectId ?? "",
    clientId: initial?.clientId ?? "",
    vendor: initial?.vendor ?? "",
    taxIncluded: initial?.taxIncluded ?? false,
    taxAmount: initial?.taxAmount ?? "",
    receiptUrl: initial?.receiptUrl ?? null,
  });

  async function handleReceipt(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      if (initial?.id) formData.append("expenseId", initial.id);

      const res = await fetch("/api/expenses/receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Upload failed: ${res.status}`);
      }
      setForm((f) => ({ ...f, receiptUrl: data.storageKey as string }));
      toast.success(t("Struk diunggah", "Receipt uploaded"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Gagal unggah", "Upload failed");
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error(t("Jumlah harus lebih dari 0", "Amount must be greater than 0"));
      return;
    }
    if (!form.description.trim()) {
      toast.error(t("Deskripsi wajib diisi", "Description is required"));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        currency: form.currency,
        date: form.date,
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        projectId: form.projectId || null,
        clientId: form.clientId || null,
        vendor: form.vendor.trim() || null,
        taxIncluded: form.taxIncluded,
        taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : null,
        receiptUrl: form.receiptUrl,
      };

      if (mode === "edit" && initial?.id) {
        await updateExpense(initial.id, payload);
        toast.success(t("Pengeluaran diperbarui", "Expense updated"));
      } else {
        await createExpense({ workspaceId, ...payload });
        toast.success(t("Pengeluaran ditambahkan", "Expense added"));
        setForm({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          currency: defaultCurrency,
          description: "",
          categoryId: "",
          projectId: "",
          clientId: "",
          vendor: "",
          taxIncluded: false,
          taxAmount: "",
          receiptUrl: null,
        });
      }
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Terjadi kesalahan", "Something went wrong");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const gridCols = compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`grid gap-3 ${gridCols}`}>
        <div className="space-y-1">
          <Label htmlFor="date" className="text-xs">{t("Tanggal", "Date")}</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount" className="text-xs">{t("Jumlah", "Amount")}</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
            required
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="currency" className="text-xs">{t("Mata uang", "Currency")}</Label>
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger id="currency" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="category" className="text-xs">{t("Kategori", "Category")}</Label>
          <Select
            value={form.categoryId || NONE}
            onValueChange={(v) => setForm({ ...form, categoryId: v === NONE ? "" : v })}
          >
            <SelectTrigger id="category" className="h-9">
              <SelectValue placeholder={t("Pilih", "Pick one")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("Tanpa kategori", "No category")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={`space-y-1 ${compact ? "col-span-2 md:col-span-4" : "md:col-span-2"}`}>
          <Label htmlFor="description" className="text-xs">{t("Deskripsi", "Description")}</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("Untuk apa pengeluaran ini?", "What is this expense for?")}
            required
            className="h-9"
          />
        </div>
      </div>

      {compact && (
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showMore
            ? t("Sembunyikan detail", "Hide details")
            : t("Vendor, proyek, klien, pajak, struk", "Vendor, project, client, tax, receipt")}
        </button>
      )}

      {showMore && (
        <div className={`grid gap-3 ${gridCols}`}>
          <div className="space-y-1">
            <Label htmlFor="vendor" className="text-xs">{t("Vendor (opsional)", "Vendor (optional)")}</Label>
            <Input
              id="vendor"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="e.g. Figma, Grab"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project" className="text-xs">{t("Proyek (opsional)", "Project (optional)")}</Label>
            <Select
              value={form.projectId || NONE}
              onValueChange={(v) => setForm({ ...form, projectId: v === NONE ? "" : v })}
            >
              <SelectTrigger id="project" className="h-9">
                <SelectValue placeholder={t("Tidak ada", "None")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("Tidak ada", "None")}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="client" className="text-xs">{t("Klien (opsional)", "Client (optional)")}</Label>
            <Select
              value={form.clientId || NONE}
              onValueChange={(v) => setForm({ ...form, clientId: v === NONE ? "" : v })}
            >
              <SelectTrigger id="client" className="h-9">
                <SelectValue placeholder={t("Tidak ada", "None")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("Tidak ada", "None")}</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="taxAmount" className="text-xs">{t("Pajak (opsional)", "Tax (optional)")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="taxAmount"
                type="number"
                step="0.01"
                min="0"
                value={form.taxAmount}
                onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
                placeholder="0"
                className="h-9"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={form.taxIncluded}
                  onChange={(e) => setForm({ ...form, taxIncluded: e.target.checked })}
                  className="rounded border-slate-300"
                />
                {t("Termasuk", "Included")}
              </label>
            </div>
          </div>
          <div className={`space-y-1 ${compact ? "col-span-2" : ""}`}>
            <Label className="text-xs">{t("Struk / bukti", "Receipt")}</Label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-slate-200 text-xs cursor-pointer hover:bg-slate-50">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleReceipt(e.target.files?.[0])}
                  disabled={uploading}
                />
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                {form.receiptUrl
                  ? t("Ganti struk", "Replace receipt")
                  : t("Unggah struk", "Upload receipt")}
              </label>
              {form.receiptUrl && (
                <span className="text-xs text-emerald-600 truncate max-w-[180px]">
                  {form.receiptUrl.split("/").pop()}
                </span>
              )}
              {form.receiptUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-slate-500"
                  onClick={() => setForm({ ...form, receiptUrl: null })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || uploading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          {loading
            ? t("Menyimpan...", "Saving...")
            : mode === "edit"
              ? t("Simpan perubahan", "Save changes")
              : t("Tambah pengeluaran", "Add expense")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            {t("Batal", "Cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
