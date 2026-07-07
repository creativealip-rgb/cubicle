"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
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
import { Textarea } from "@/components/ui/textarea";

interface ClientOption {
  id: string;
  name: string;
  companyName: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  clientId: string;
  billingType: string;
}

interface TemplateOption {
  id: string;
  name: string;
  defaultCurrency: string | null;
  defaultTaxRate: string | null;
  notes: string | null;
  terms: string | null;
}

interface InvoiceFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    id?: string;
    clientId?: string;
    projectId?: string;
    issueDate?: string;
    dueDate?: string;
    currency?: string;
    notes?: string;
    terms?: string;
  };
  clients: ClientOption[];
  projects?: ProjectOption[];
  templates?: TemplateOption[];
  onSuccess?: () => void;
}

export function InvoiceForm({ mode, defaultValues, clients, projects, templates, onSuccess }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: defaultValues?.clientId ?? "",
    projectId: defaultValues?.projectId ?? "",
    issueDate: defaultValues?.issueDate ?? new Date().toISOString().split("T")[0],
    dueDate: defaultValues?.dueDate ?? "",
    currency: defaultValues?.currency ?? "IDR",
    notes: defaultValues?.notes ?? "",
    terms: defaultValues?.terms ?? "",
  });

  // Filter projects by selected client
  const clientProjects = projects?.filter(p => p.clientId === form.clientId) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        clientId: form.clientId,
        projectId: form.projectId || undefined,
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        currency: form.currency,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
      };

      if (mode === "create") {
        const invoice = await createInvoice(data);
        toast.success("Invoice dibuat");
        router.push(`/app/invoices/${invoice.id}`);
      } else if (defaultValues?.id) {
        await updateInvoice(defaultValues.id, data);
        toast.success("Invoice diperbarui");
      }

      onSuccess?.();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function applyTemplate(templateId: string) {
    const tpl = templates?.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((prev) => ({
      ...prev,
      currency: tpl.defaultCurrency || prev.currency,
      notes: tpl.notes || prev.notes,
      terms: tpl.terms || prev.terms,
    }));
    toast.success(`Template "${tpl.name}" diterapkan`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {templates && templates.length > 0 && mode === "create" && (
        <div className="space-y-2">
          <Label>Apply Template (opsional)</Label>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.defaultCurrency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="clientId">Klien *</Label>
        <Select
          value={form.clientId}
          onValueChange={(v) => set("clientId", v)}
          disabled={mode === "edit"}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih klien" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.companyName || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {clientProjects.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="projectId">Proyek (opsional)</Label>
          <Select
            value={form.projectId}
            onValueChange={(v) => set("projectId", v === "_none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tidak terikat proyek" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Tidak terikat proyek</SelectItem>
              {clientProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.billingType === "hours" ? "By Hours" : "By Project"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Tanggal Terbit *</Label>
          <Input
            id="issueDate"
            type="date"
            value={form.issueDate}
            onChange={(e) => set("issueDate", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Jatuh Tempo</Label>
          <Input
            id="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Mata Uang</Label>
        <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
            <SelectItem value="GBP">GBP - British Pound</SelectItem>
            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Catatan yang tampil di invoice..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">Syarat</Label>
        <Input
          id="terms"
          value={form.terms}
          onChange={(e) => set("terms", e.target.value)}
          placeholder="contoh: Net 30, jatuh tempo dalam 14 hari..."
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Menyimpan..." : mode === "create" ? "Buat Invoice" : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
