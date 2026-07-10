"use client";

import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, FileText, FileSignature, Sparkles } from "lucide-react";
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

export function TemplateCenterClient() {
  const [activeTab, setActiveTab] = useState("invoice");
  const [invoiceTpls, setInvoiceTpls] = useState<InvoiceTpl[]>([]);
  const [contractTpls, setContractTpls] = useState<ContractTpl[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"invoice" | "contract">("invoice");
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formCurrency, setFormCurrency] = useState("IDR");

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
      toast.error("Gagal load templates");
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
    setEditingId(null);
  }

  function openCreate(type: "invoice" | "contract") {
    resetForm();
    setEditingType(type);
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
      setFormCurrency(t.defaultCurrency);
    } else {
      const t = tpl as ContractTpl;
      setFormBody(t.body || "");
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }

    setSaving(true);
    try {
      if (editingType === "invoice") {
        const input = {
          name: formName.trim(),
          notes: formNotes.trim() || undefined,
          terms: formTerms.trim() || undefined,
          defaultCurrency: formCurrency,
          defaultTaxRate: "0",
        };
        if (editingId) {
          await updateInvoiceTemplate(editingId, input);
          toast.success("Invoice template diupdate");
        } else {
          await createInvoiceTemplate(input);
          toast.success("Invoice template dibuat");
        }
      } else {
        const input = {
          name: formName.trim(),
          body: formBody.trim() || undefined,
          isDefault: false,
        };
        if (editingId) {
          await updateContractTemplate(editingId, input);
          toast.success("Contract template diupdate");
        } else {
          await createContractTemplate(input);
          toast.success("Contract template dibuat");
        }
      }

      setDialogOpen(false);
      resetForm();
      await loadAll();
    } catch {
      toast.error("Gagal simpan template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type: "invoice" | "contract", id: string) {
    if (!confirm("Hapus template ini?")) return;
    try {
      if (type === "invoice") {
        await deleteInvoiceTemplate(id);
      } else {
        await deleteContractTemplate(id);
      }
      toast.success("Template dihapus");
      await loadAll();
    } catch {
      toast.error("Gagal hapus template");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Template Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola semua template: invoice, contract, dan prompt AI.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoice" className="gap-1.5">
            <FileText className="h-4 w-4" /> Invoice ({invoiceTpls.length})
          </TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5">
            <FileSignature className="h-4 w-4" /> Contract ({contractTpls.length})
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-1.5" disabled>
            <Sparkles className="h-4 w-4" /> AI Prompt (soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => openCreate("invoice")}>
              <Plus className="mr-1 h-3 w-3" /> Invoice Template
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : invoiceTpls.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">Belum ada invoice template</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {invoiceTpls.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  name={tpl.name}
                  subtitle={`${tpl.defaultCurrency} · PPN ${tpl.defaultTaxRate}%`}
                  preview={tpl.notes}
                  onEdit={() => openEdit("invoice", tpl)}
                  onDelete={() => handleDelete("invoice", tpl.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contract" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => openCreate("contract")}>
              <Plus className="mr-1 h-3 w-3" /> Contract Template
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : contractTpls.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <FileSignature className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">Belum ada contract template</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contractTpls.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  name={tpl.name}
                  subtitle={tpl.isDefault ? "Default" : undefined}
                  preview={tpl.body?.slice(0, 100)}
                  onEdit={() => openEdit("contract", tpl)}
                  onDelete={() => handleDelete("contract", tpl.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">Coming soon</p>
            <p className="text-xs text-muted-foreground">Custom AI prompt templates</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Unified Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Buat"} {editingType === "invoice" ? "Invoice" : "Contract"} Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="tpl-name">Nama Template *</Label>
              <Input
                id="tpl-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="contoh: Standard Contract"
              />
            </div>

            {editingType === "invoice" && (
              <>
                <div>
                  <Label htmlFor="tpl-notes">Notes</Label>
                  <Textarea
                    id="tpl-notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Catatan default untuk invoice..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="tpl-terms">Terms & Conditions</Label>
                  <Textarea
                    id="tpl-terms"
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    placeholder="Syarat pembayaran..."
                    rows={2}
                  />
                </div>
              </>
            )}

            {editingType === "contract" && (
              <div>
                <Label htmlFor="tpl-body">Contract Body</Label>
                <Textarea
                  id="tpl-body"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Isi kontrak template..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gunakan {"{{client_name}}"}, {"{{project_name}}"}, dll sebagai variabel.
                </p>
              </div>
            )}

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
  );
}

function TemplateCard({
  name,
  subtitle,
  preview,
  onEdit,
  onDelete,
}: {
  name: string;
  subtitle?: string;
  preview?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-sm">{name}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-2">{preview}</p>
      )}
    </div>
  );
}
