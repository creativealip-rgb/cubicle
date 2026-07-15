"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  FileSignature,
  Sparkles,
  ExternalLink,
  Star,
} from "lucide-react";
import {
  listInvoiceTemplates,
  createInvoiceTemplate,
  updateInvoiceTemplate,
  deleteInvoiceTemplate,
} from "@/lib/actions/invoice-templates";
import {
  listContractTemplates,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
} from "@/lib/actions/contract-templates";
import { toast } from "sonner";

interface InvoiceTpl {
  id: string;
  name: string;
  terms: string | null;
  notes: string | null;
  defaultCurrency: string;
  defaultTaxRate: string;
  lineItems: string | null;
}

interface ContractTpl {
  id: string;
  name: string;
  body: string | null;
  isDefault: boolean;
}

const DEFAULT_CONTRACT_BODY = `# Perjanjian Jasa

Perjanjian ini dibuat pada **{{today}}** antara:

**Penyedia:** {{workspace.name}}
**Klien:** {{client.name}} <{{client.email}}>

## 1. Lingkup pekerjaan

Penyedia setuju mengerjakan layanan untuk **{{project.name}}**:

{{scope}}

## 2. Kompensasi

Nilai kontrak: **{{value}}**

Syarat pembayaran: 50% di muka, 50% saat serah terima.

## 3. Jadwal

Perjanjian berlaku sampai **{{valid_until}}**.

## 4. Kerahasiaan

Kedua pihak menjaga kerahasiaan informasi proprietary.

## 5. Pengakhiran

Masing-masing pihak dapat mengakhiri dengan pemberitahuan tertulis 14 hari.

Dengan menandatangani di bawah, kedua pihak menyetujui syarat di atas.
`;

export function TemplateCenterClient({
  initialTab = "invoice",
}: {
  initialTab?: "invoice" | "contract" | "prompt";
}) {
  const startTab =
    initialTab === "contract" || initialTab === "prompt" ? initialTab : "invoice";
  const [activeTab, setActiveTab] = useState(startTab);
  const [invoiceTpls, setInvoiceTpls] = useState<InvoiceTpl[]>([]);
  const [contractTpls, setContractTpls] = useState<ContractTpl[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"invoice" | "contract">("invoice");
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formCurrency, setFormCurrency] = useState("IDR");
  const [formTaxRate, setFormTaxRate] = useState("0");
  const [formIsDefault, setFormIsDefault] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [inv, con] = await Promise.all([
        listInvoiceTemplates(),
        listContractTemplates(),
      ]);
      setInvoiceTpls(inv as InvoiceTpl[]);
      setContractTpls(con as ContractTpl[]);
    } catch {
      toast.error("Gagal memuat template");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormBody("");
    setFormNotes("");
    setFormTerms("");
    setFormCurrency("IDR");
    setFormTaxRate("0");
    setFormIsDefault(false);
    setEditingId(null);
  }

  function openCreate(type: "invoice" | "contract") {
    resetForm();
    setEditingType(type);
    if (type === "contract") setFormBody(DEFAULT_CONTRACT_BODY);
    if (type === "invoice") {
      setFormNotes("Terima kasih atas kepercayaannya.");
      setFormTerms("Pembayaran jatuh tempo dalam 14 hari.");
    }
    setDialogOpen(true);
  }

  function openEdit(type: "invoice" | "contract", tpl: InvoiceTpl | ContractTpl) {
    setEditingType(type);
    setEditingId(tpl.id);
    setFormName(tpl.name);
    if (type === "invoice") {
      const t = tpl as InvoiceTpl;
      setFormNotes(t.notes || "");
      setFormTerms(t.terms || "");
      setFormCurrency(t.defaultCurrency || "IDR");
      setFormTaxRate(String(t.defaultTaxRate ?? "0"));
      setFormBody("");
      setFormIsDefault(false);
    } else {
      const t = tpl as ContractTpl;
      setFormBody(t.body || "");
      setFormIsDefault(!!t.isDefault);
      setFormNotes("");
      setFormTerms("");
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }
    if (editingType === "contract" && !formBody.trim()) {
      toast.error("Isi kontrak wajib diisi");
      return;
    }

    setSaving(true);
    try {
      if (editingType === "invoice") {
        const input = {
          name: formName.trim(),
          notes: formNotes.trim() || undefined,
          terms: formTerms.trim() || undefined,
          defaultCurrency: formCurrency || "IDR",
          defaultTaxRate: formTaxRate || "0",
        };
        if (editingId) {
          await updateInvoiceTemplate(editingId, input);
          toast.success("Template invoice diperbarui");
        } else {
          await createInvoiceTemplate(input);
          toast.success("Template invoice dibuat");
        }
      } else {
        const input = {
          name: formName.trim(),
          body: formBody.trim(),
          isDefault: formIsDefault,
        };
        if (editingId) {
          await updateContractTemplate(editingId, input);
          toast.success("Template kontrak diperbarui");
        } else {
          await createContractTemplate(input);
          toast.success("Template kontrak dibuat");
        }
      }

      setDialogOpen(false);
      resetForm();
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan template";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type: "invoice" | "contract", id: string, name: string) {
    if (!confirm(`Hapus template "${name}"?`)) return;
    try {
      if (type === "invoice") await deleteInvoiceTemplate(id);
      else await deleteContractTemplate(id);
      toast.success("Template dihapus");
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus template";
      toast.error(msg);
    }
  }

  const invoiceEmpty = !loading && invoiceTpls.length === 0;
  const contractEmpty = !loading && contractTpls.length === 0;

  const dialogTitle = useMemo(() => {
    const kind = editingType === "invoice" ? "invoice" : "kontrak";
    return editingId ? `Edit template ${kind}` : `Buat template ${kind}`;
  }, [editingId, editingType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pusat Template</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola template invoice, kontrak, dan prompt AI di satu tempat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/invoices/new">
              Buat invoice
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/contract-templates">
              Template kontrak penuh
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="invoice" className="gap-1.5">
            <FileText className="h-4 w-4" /> Invoice ({invoiceTpls.length})
          </TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5">
            <FileSignature className="h-4 w-4" /> Kontrak ({contractTpls.length})
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-1.5" disabled>
            <Sparkles className="h-4 w-4" /> Prompt AI (segera)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openCreate("invoice")}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Template invoice
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : invoiceEmpty ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">Belum ada template invoice</p>
              <p className="text-xs text-muted-foreground mt-1">
                Simpan notes, terms, mata uang, dan PPN default.
              </p>
              <Button size="sm" className="mt-4" onClick={() => openCreate("invoice")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Buat template pertama
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {invoiceTpls.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  name={tpl.name}
                  subtitle={`${tpl.defaultCurrency} · PPN ${tpl.defaultTaxRate}%`}
                  preview={tpl.notes || tpl.terms}
                  onEdit={() => openEdit("invoice", tpl)}
                  onDelete={() => handleDelete("invoice", tpl.id, tpl.name)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contract" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Placeholder: {"{{client.name}}"}, {"{{workspace.name}}"}, {"{{today}}"},{" "}
              {"{{valid_until}}"}
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/app/contract-templates/new">Editor penuh</Link>
              </Button>
              <Button size="sm" onClick={() => openCreate("contract")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Template kontrak
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : contractEmpty ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <FileSignature className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">Belum ada template kontrak</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tulis sekali, pakai ulang saat kirim kontrak ke klien.
              </p>
              <Button size="sm" className="mt-4" onClick={() => openCreate("contract")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Buat template pertama
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contractTpls.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  name={tpl.name}
                  subtitle={tpl.isDefault ? "Default" : undefined}
                  badge={tpl.isDefault}
                  preview={tpl.body?.slice(0, 120)}
                  onEdit={() => openEdit("contract", tpl)}
                  onDelete={() => handleDelete("contract", tpl.id, tpl.name)}
                  href={`/app/contract-templates/${tpl.id}`}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">Segera hadir</p>
            <p className="text-xs text-muted-foreground">
              Template prompt AI kustom untuk workspace.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Nama template *</Label>
              <Input
                id="tpl-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  editingType === "invoice"
                    ? "mis. Invoice retainer bulanan"
                    : "mis. Perjanjian jasa standar"
                }
              />
            </div>

            {editingType === "invoice" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mata uang</Label>
                    <Select value={formCurrency} onValueChange={setFormCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["IDR", "USD", "SGD", "EUR", "AUD"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-tax">PPN default (%)</Label>
                    <Input
                      id="tpl-tax"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formTaxRate}
                      onChange={(e) => setFormTaxRate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-notes">Catatan</Label>
                  <Textarea
                    id="tpl-notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Catatan default untuk invoice..."
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-terms">Syarat & ketentuan</Label>
                  <Textarea
                    id="tpl-terms"
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    placeholder="Syarat pembayaran..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-body">Isi kontrak *</Label>
                  <Textarea
                    id="tpl-body"
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Isi template kontrak..."
                    rows={10}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholder: {"{{client.name}}"}, {"{{client.email}}"},{" "}
                    {"{{workspace.name}}"}, {"{{project.name}}"}, {"{{today}}"},{" "}
                    {"{{valid_until}}"}, {"{{value}}"}, {"{{scope}}"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  Jadikan template default
                </label>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Simpan" : "Buat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  name,
  subtitle,
  preview,
  badge,
  onEdit,
  onDelete,
  href,
}: {
  name: string;
  subtitle?: string;
  preview?: string | null;
  badge?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  href?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="font-medium text-sm hover:underline line-clamp-1">
              {name}
            </Link>
          ) : (
            <h3 className="font-medium text-sm line-clamp-1">{name}</h3>
          )}
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {badge ? <Star className="h-3 w-3 text-amber-500" /> : null}
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {preview ? (
        <p className="text-xs text-muted-foreground line-clamp-2">{preview}</p>
      ) : null}
    </div>
  );
}
