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

interface InvoiceFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    id?: string;
    clientId?: string;
    issueDate?: string;
    dueDate?: string;
    currency?: string;
    notes?: string;
    terms?: string;
  };
  clients: ClientOption[];
  onSuccess?: () => void;
}

export function InvoiceForm({ mode, defaultValues, clients, onSuccess }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: defaultValues?.clientId ?? "",
    issueDate: defaultValues?.issueDate ?? new Date().toISOString().split("T")[0],
    dueDate: defaultValues?.dueDate ?? "",
    currency: defaultValues?.currency ?? "USD",
    notes: defaultValues?.notes ?? "",
    terms: defaultValues?.terms ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        clientId: form.clientId,
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        currency: form.currency,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
      };

      if (mode === "create") {
        const invoice = await createInvoice(data);
        toast.success("Invoice created");
        router.push(`/app/invoices/${invoice.id}`);
      } else if (defaultValues?.id) {
        await updateInvoice(defaultValues.id, data);
        toast.success("Invoice updated");
      }

      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clientId">Client *</Label>
        <Select
          value={form.clientId}
          onValueChange={(v) => set("clientId", v)}
          disabled={mode === "edit"}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a client" />
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue Date *</Label>
          <Input
            id="issueDate"
            type="date"
            value={form.issueDate}
            onChange={(e) => set("issueDate", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
            <SelectItem value="GBP">GBP - British Pound</SelectItem>
            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notes visible on the invoice..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">Terms</Label>
        <Input
          id="terms"
          value={form.terms}
          onChange={(e) => set("terms", e.target.value)}
          placeholder="e.g. Net 30, Payment due within 14 days..."
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : mode === "create" ? "Create Invoice" : "Save Changes"}
      </Button>
    </form>
  );
}
