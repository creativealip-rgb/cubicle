"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import {
  createInvoiceTemplate,
  updateInvoiceTemplate,
  deleteInvoiceTemplate,
  listInvoiceTemplates,
} from "@/lib/actions/invoice-templates";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  terms: string | null;
  notes: string | null;
  defaultCurrency: string;
  defaultTaxRate: string;
  lineItems: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export function InvoiceTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [taxRate, setTaxRate] = useState("0");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await listInvoiceTemplates();
      setTemplates(data as Template[]);
    } catch {
      toast.error("Gagal load templates");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setTerms("");
    setNotes("");
    setCurrency("IDR");
    setTaxRate("0");
    setLineItems([]);
    setEditingId(null);
  }

  function openEdit(template: Template) {
    setEditingId(template.id);
    setName(template.name);
    setTerms(template.terms || "");
    setNotes(template.notes || "");
    setCurrency(template.defaultCurrency);
    setTaxRate(template.defaultTaxRate);
    try {
      setLineItems(template.lineItems ? JSON.parse(template.lineItems) : []);
    } catch {
      setLineItems([]);
    }
    setDialogOpen(true);
  }

  function addLineItem() {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        terms: terms.trim() || undefined,
        notes: notes.trim() || undefined,
        defaultCurrency: currency,
        defaultTaxRate: taxRate,
        lineItems: lineItems.length > 0 ? JSON.stringify(lineItems) : undefined,
      };

      if (editingId) {
        await updateInvoiceTemplate(editingId, input);
        toast.success("Template diupdate");
      } else {
        await createInvoiceTemplate(input);
        toast.success("Template dibuat");
      }

      setDialogOpen(false);
      resetForm();
      await loadTemplates();
    } catch {
      toast.error("Gagal simpan template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus template ini?")) return;
    try {
      await deleteInvoiceTemplate(id);
      toast.success("Template dihapus");
      await loadTemplates();
    } catch {
      toast.error("Gagal hapus template");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buat template untuk invoice berulang. Simpan line items, terms, dan notes default.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Template Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Template" : "Buat Template Baru"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="tpl-name">Nama Template *</Label>
                <Input
                  id="tpl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="contoh: Monthly VA Invoice"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tpl-currency">Mata Uang</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="tpl-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                      <SelectItem value="USD">USD (Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tpl-tax">Tax Rate (%)</Label>
                  <Input
                    id="tpl-tax"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                </div>
              </div>

              <div>
                <Label>Default Line Items</Label>
                <div className="space-y-2 mt-2">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Input
                        className="flex-1"
                        placeholder="Deskripsi"
                        value={item.description}
                        onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      />
                      <Input
                        className="w-20"
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))}
                        min="0"
                        step="0.5"
                      />
                      <Input
                        className="w-32"
                        type="number"
                        placeholder="Harga"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(i, "unitPrice", Number(e.target.value))}
                        min="0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="mr-1 h-3 w-3" /> Tambah Item
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="tpl-notes">Notes (tampil di invoice)</Label>
                <Textarea
                  id="tpl-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terima kasih atas kepercayaannya."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="tpl-terms">Terms & Conditions</Label>
                <Textarea
                  id="tpl-terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Pembayaran via transfer bank dalam 14 hari."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat...</div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">Belum ada template</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Buat template untuk mempercepat pembuatan invoice berulang.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            let items: LineItem[] = [];
            try {
              items = tpl.lineItems ? JSON.parse(tpl.lineItems) : [];
            } catch { /* ignore */ }

            return (
              <div key={tpl.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tpl.defaultCurrency} · PPN {tpl.defaultTaxRate}%
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tpl)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(tpl.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="space-y-1">
                    {items.slice(0, 3).map((item, i) => (
                      <p key={i} className="text-xs text-muted-foreground truncate">
                        • {item.description || "(no desc)"} × {item.quantity}
                      </p>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{items.length - 3} lainnya</p>
                    )}
                  </div>
                )}

                {tpl.notes && (
                  <p className="text-xs text-muted-foreground italic truncate">
                    &quot;{tpl.notes}&quot;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
