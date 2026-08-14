"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  ExternalLink,
  Star,
  Copy,
  Maximize2,
  ScrollText,
} from "lucide-react";
import {
  listInvoiceTemplates,
  createInvoiceTemplate,
  updateInvoiceTemplate,
  deleteInvoiceTemplate,
  duplicateInvoiceTemplate,
} from "@/lib/actions/invoice-templates";
import {
  listContractTemplates,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
  setDefaultContractTemplate,
  duplicateContractTemplate,
} from "@/lib/actions/contract-templates";
import {
  listProposalTemplates,
  createProposalTemplate,
  updateProposalTemplate,
  deleteProposalTemplate,
  setDefaultProposalTemplate,
  duplicateProposalTemplate,
} from "@/lib/actions/proposal-templates";
import { toast } from "sonner";
import { useT } from "@/lib/i18n-client";

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

interface ProposalTpl {
  id: string;
  name: string;
  body: string | null;
  defaultCurrency: string;
  defaultTaxRate: string;
  defaultDownPaymentPercent: string;
  lineItems: string | null;
  isDefault: boolean;
}

export type TemplateTabKey = "proposal" | "contract" | "invoice";
type EditableType = "invoice" | "contract" | "proposal";

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

const DEFAULT_PROPOSAL_BODY = `## Ringkasan

Terima kasih atas kesempatan ini. Berikut proposal untuk **{{project.name}}**.

## Lingkup pekerjaan

- Item 1
- Item 2
- Item 3

## Timeline

Estimasi pengerjaan: 2–4 minggu sejak kickoff.

## Investasi

Lihat rincian item di bawah. DP **{{dp}}%** di muka, sisanya sesuai milestone.

## Catatan

Proposal berlaku sampai **{{valid_until}}**.
`;

export function normalizeTemplateTab(tab?: string | null): TemplateTabKey {
  if (tab === "contract" || tab === "proposal" || tab === "invoice") {
    return tab;
  }
  return "proposal";
}

export function TemplateCenterClient({
  initialTab = "proposal",
}: {
  initialTab?: TemplateTabKey;
}) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = normalizeTemplateTab(searchParams.get("tab") ?? initialTab);

  const [activeTab, setActiveTab] = useState<TemplateTabKey>(urlTab);
  const [invoiceTpls, setInvoiceTpls] = useState<InvoiceTpl[]>([]);
  const [contractTpls, setContractTpls] = useState<ContractTpl[]>([]);
  const [proposalTpls, setProposalTpls] = useState<ProposalTpl[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<EditableType>("invoice");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formCurrency, setFormCurrency] = useState("IDR");
  const [formTaxRate, setFormTaxRate] = useState("0");
  const [formDpPercent, setFormDpPercent] = useState("50");
  const [formIsDefault, setFormIsDefault] = useState(false);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const changeTab = useCallback(
    (tab: string) => {
      const next = normalizeTemplateTab(tab);
      setActiveTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "proposal") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [inv, con, prop] = await Promise.all([
        listInvoiceTemplates(),
        listContractTemplates(),
        listProposalTemplates(),
      ]);
      setInvoiceTpls(inv as InvoiceTpl[]);
      setContractTpls(con as ContractTpl[]);
      setProposalTpls(prop as ProposalTpl[]);
    } catch {
      toast.error(t("Gagal memuat template", "Failed to load templates"));
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
    setFormDpPercent("50");
    setFormIsDefault(false);
    setEditingId(null);
  }

  function openCreate(type: EditableType) {
    resetForm();
    setEditingType(type);
    if (type === "contract") setFormBody(DEFAULT_CONTRACT_BODY);
    if (type === "proposal") {
      setFormBody(DEFAULT_PROPOSAL_BODY);
      setFormCurrency("IDR");
      setFormTaxRate("0");
      setFormDpPercent("50");
    }
    if (type === "invoice") {
      setFormNotes("Terima kasih atas kepercayaannya.");
      setFormTerms("Pembayaran jatuh tempo dalam 14 hari.");
    }
    setDialogOpen(true);
  }

  function openEdit(type: EditableType, tpl: InvoiceTpl | ContractTpl | ProposalTpl) {
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
      setFormDpPercent("50");
      setFormIsDefault(false);
    } else if (type === "contract") {
      // Contract templates open the block editor (DocumentBlockEditor).
      router.push(`/app/templates/${tpl.id}/edit`);
      return;
    } else {
      // Proposal templates open the block editor (DocumentBlockEditor).
      router.push(`/app/templates/${tpl.id}/edit/proposal`);
      return;
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error(t("Nama template wajib diisi", "Template name is required"));
      return;
    }
    if (editingType === "contract" && !formBody.trim()) {
      toast.error(t("Isi kontrak wajib diisi", "Contract body is required"));
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
          toast.success(t("Template invoice diperbarui", "Invoice template updated"));
        } else {
          await createInvoiceTemplate(input);
          toast.success(t("Template invoice dibuat", "Invoice template created"));
        }
      } else if (editingType === "contract") {
        const input = {
          name: formName.trim(),
          body: formBody.trim(),
          isDefault: formIsDefault,
        };
        if (editingId) {
          await updateContractTemplate(editingId, input);
          toast.success(t("Template kontrak diperbarui", "Contract template updated"));
        } else {
          const created = await createContractTemplate(input);
          toast.success(t("Template kontrak dibuat", "Contract template created"));
          setDialogOpen(false);
          resetForm();
          router.push(`/app/templates/${created.id}/edit`);
          return;
        }
      } else {
        const input = {
          name: formName.trim(),
          body: formBody.trim() || null,
          defaultCurrency: formCurrency || "IDR",
          defaultTaxRate: formTaxRate || "0",
          defaultDownPaymentPercent: formDpPercent || "50",
          isDefault: formIsDefault,
        };
        if (editingId) {
          await updateProposalTemplate(editingId, input);
          toast.success(t("Template proposal diperbarui", "Proposal template updated"));
        } else {
          const created = await createProposalTemplate(input);
          toast.success(t("Template proposal dibuat", "Proposal template created"));
          setDialogOpen(false);
          resetForm();
          router.push(`/app/templates/${created.id}/edit/proposal`);
          return;
        }
      }

      setDialogOpen(false);
      resetForm();
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Gagal menyimpan template", "Failed to save template");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type: EditableType, id: string, name: string) {
    if (!confirm(t(`Hapus template "${name}"?`, `Delete template "${name}"?`))) return;
    setBusyId(id);
    try {
      if (type === "invoice") await deleteInvoiceTemplate(id);
      else if (type === "contract") await deleteContractTemplate(id);
      else await deleteProposalTemplate(id);
      toast.success(t("Template dihapus", "Template deleted"));
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Gagal menghapus template", "Failed to delete template");
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(type: EditableType, id: string) {
    setBusyId(id);
    try {
      if (type === "invoice") {
        await duplicateInvoiceTemplate(id);
        toast.success(t("Template invoice diduplikasi", "Invoice template duplicated"));
      } else if (type === "contract") {
        await duplicateContractTemplate(id);
        toast.success(t("Template kontrak diduplikasi", "Contract template duplicated"));
      } else {
        await duplicateProposalTemplate(id);
        toast.success(t("Template proposal diduplikasi", "Proposal template duplicated"));
      }
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Gagal menduplikasi template", "Failed to duplicate template");
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(type: "contract" | "proposal", id: string) {
    setBusyId(id);
    try {
      if (type === "contract") await setDefaultContractTemplate(id);
      else await setDefaultProposalTemplate(id);
      toast.success(t("Template default diperbarui", "Default template updated"));
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Gagal set default", "Failed to set default");
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  const invoiceEmpty = !loading && invoiceTpls.length === 0;
  const contractEmpty = !loading && contractTpls.length === 0;
  const proposalEmpty = !loading && proposalTpls.length === 0;

  const dialogTitle = useMemo(() => {
    const kind =
      editingType === "invoice"
        ? t("invoice", "invoice")
        : editingType === "contract"
          ? t("kontrak", "contract")
          : t("proposal", "proposal");
    return editingId ? `${t("Edit template", "Edit template")} ${kind}` : `${t("Buat template", "Create template")} ${kind}`;
  }, [editingId, editingType, t]);

  return (
    <div className="space-y-6">
      <div className="app-page-header">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Pusat Template", "Template Center")}</h1>
          <p className="app-page-description">
            {t(
              "Simpan sekali, pakai ulang di proposal, kontrak, dan invoice.",
              "Save once, reuse across proposals, contracts, and invoices.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/proposals/new">
              {t("Buat proposal", "New proposal")}
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/invoices/new">
              {t("Buat invoice", "New invoice")}
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/contracts">
              {t("Lihat kontrak", "View contracts")}
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="inline-flex h-auto max-w-full justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="proposal" className="gap-1.5">
            <ScrollText className="h-4 w-4" /> {t("Proposal", "Proposals")} ({proposalTpls.length})
          </TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5">
            <FileSignature className="h-4 w-4" /> {t("Kontrak", "Contracts")} ({contractTpls.length})
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5">
            <FileText className="h-4 w-4" /> {t("Invoice", "Invoices")} ({invoiceTpls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t("Notes, terms, mata uang, dan PPN default.", "Default notes, terms, currency, and tax.")}
            </p>
            <Button size="sm" onClick={() => openCreate("invoice")}>
              <Plus className="mr-1 h-3.5 w-3.5" /> {t("Template invoice", "Invoice template")}
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("Memuat...", "Loading...")}</p>
          ) : invoiceEmpty ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">{t("Belum ada template invoice", "No invoice templates yet")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Simpan notes, terms, mata uang, dan PPN default.", "Save default notes, terms, currency, and tax.")}
              </p>
              <Button size="sm" className="mt-4" onClick={() => openCreate("invoice")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> {t("Buat template pertama", "Create first template")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {invoiceTpls.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  name={tpl.name}
                  subtitle={`${tpl.defaultCurrency} · ${t("PPN", "Tax")} ${tpl.defaultTaxRate}%`}
                  preview={tpl.notes || tpl.terms}
                  busy={busyId === tpl.id}
                  onEdit={() => openEdit("invoice", tpl)}
                  onDuplicate={() => handleDuplicate("invoice", tpl.id)}
                  onDelete={() => handleDelete("invoice", tpl.id, tpl.name)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proposal" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t(
                "Scope body, mata uang, PPN, dan DP default.",
                "Default scope body, currency, tax, and down payment.",
              )}
            </p>
            <Button size="sm" onClick={() => openCreate("proposal")}>
              <Plus className="mr-1 h-3.5 w-3.5" /> {t("Template proposal", "Proposal template")}
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("Memuat...", "Loading...")}</p>
          ) : proposalEmpty ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <ScrollText className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">{t("Belum ada template proposal", "No proposal templates yet")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  "Simpan scope, currency, PPN, dan DP untuk proposal baru.",
                  "Save scope, currency, tax, and down payment for new proposals.",
                )}
              </p>
              <Button size="sm" className="mt-4" onClick={() => openCreate("proposal")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> {t("Buat template pertama", "Create first template")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {proposalTpls.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  name={tpl.name}
                  subtitle={`${tpl.defaultCurrency} · ${t("PPN", "Tax")} ${tpl.defaultTaxRate}% · ${t("DP", "DP")} ${tpl.defaultDownPaymentPercent}%${
                    tpl.isDefault ? ` · ${t("Default", "Default")}` : ""
                  }`}
                  badge={tpl.isDefault}
                  preview={tpl.body?.slice(0, 140)}
                  busy={busyId === tpl.id}
                  onEdit={() => openEdit("proposal", tpl)}
                  onDuplicate={() => handleDuplicate("proposal", tpl.id)}
                  onSetDefault={
                    tpl.isDefault ? undefined : () => handleSetDefault("proposal", tpl.id)
                  }
                  onDelete={() => handleDelete("proposal", tpl.id, tpl.name)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contract" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t(
                "Placeholder: {{client.name}}, {{workspace.name}}, {{today}}, {{valid_until}}",
                "Placeholders: {{client.name}}, {{workspace.name}}, {{today}}, {{valid_until}}",
              )}
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/app/contract-templates/new">
                  <Maximize2 className="mr-1 h-3.5 w-3.5" />
                  {t("Editor penuh", "Full editor")}
                </Link>
              </Button>
              <Button size="sm" onClick={() => openCreate("contract")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> {t("Template kontrak", "Contract template")}
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("Memuat...", "Loading...")}</p>
          ) : contractEmpty ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <FileSignature className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">{t("Belum ada template kontrak", "No contract templates yet")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  "Tulis sekali, pakai ulang saat kirim kontrak ke klien.",
                  "Write once, reuse when sending contracts to clients.",
                )}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/app/contract-templates/new">{t("Editor penuh", "Full editor")}</Link>
                </Button>
                <Button size="sm" onClick={() => openCreate("contract")}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> {t("Buat cepat", "Quick create")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contractTpls.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  name={tpl.name}
                  subtitle={tpl.isDefault ? t("Default", "Default") : t("Template kontrak", "Contract template")}
                  badge={tpl.isDefault}
                  preview={tpl.body?.slice(0, 140)}
                  href={`/app/contract-templates/${tpl.id}`}
                  busy={busyId === tpl.id}
                  onEdit={() => openEdit("contract", tpl)}
                  onOpenFull={`/app/contract-templates/${tpl.id}`}
                  onDuplicate={() => handleDuplicate("contract", tpl.id)}
                  onSetDefault={
                    tpl.isDefault ? undefined : () => handleSetDefault("contract", tpl.id)
                  }
                  onDelete={() => handleDelete("contract", tpl.id, tpl.name)}
                />
              ))}
            </div>
          )}
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
              <Label htmlFor="tpl-name">{t("Nama template *", "Template name *")}</Label>
              <Input
                id="tpl-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  editingType === "invoice"
                    ? t("mis. Invoice retainer bulanan", "e.g. Monthly retainer invoice")
                    : editingType === "proposal"
                      ? t("mis. Proposal website standar", "e.g. Standard website proposal")
                      : t("mis. Perjanjian jasa standar", "e.g. Standard service agreement")
                }
              />
            </div>

            {editingType === "invoice" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("Mata uang", "Currency")}</Label>
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
                    <Label htmlFor="tpl-tax">{t("PPN default (%)", "Default tax (%)")}</Label>
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
                  <Label htmlFor="tpl-notes">{t("Catatan", "Notes")}</Label>
                  <Textarea
                    id="tpl-notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={t("Catatan default untuk invoice...", "Default notes for invoices...")}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-terms">{t("Syarat & ketentuan", "Terms & conditions")}</Label>
                  <Textarea
                    id="tpl-terms"
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    placeholder={t("Syarat pembayaran...", "Payment terms...")}
                    rows={2}
                  />
                </div>
              </>
            ) : editingType === "proposal" ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("Mata uang", "Currency")}</Label>
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
                    <Label htmlFor="tpl-prop-tax">{t("PPN (%)", "Tax (%)")}</Label>
                    <Input
                      id="tpl-prop-tax"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formTaxRate}
                      onChange={(e) => setFormTaxRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-dp">{t("DP (%)", "Down payment (%)")}</Label>
                    <Input
                      id="tpl-dp"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formDpPercent}
                      onChange={(e) => setFormDpPercent(e.target.value)}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  {t("Jadikan template default", "Make default template")}
                </label>
              </>
            ) : (
              <>

                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Placeholder: {{client.name}}, {{client.email}}, {{workspace.name}}, {{project.name}}, {{today}}, {{valid_until}}, {{value}}, {{scope}}",
                      "Placeholders: {{client.name}}, {{client.email}}, {{workspace.name}}, {{project.name}}, {{today}}, {{valid_until}}, {{value}}, {{scope}}",
                    )}
                  </p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  {t("Jadikan template default", "Make default template")}
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
                {t("Batal", "Cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t("Menyimpan...", "Saving...") : editingId ? t("Simpan", "Save") : t("Buat", "Create")}
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
  busy,
  onEdit,
  onDelete,
  onDuplicate,
  onSetDefault,
  onOpenFull,
  href,
}: {
  name: string;
  subtitle?: string;
  preview?: string | null;
  badge?: boolean;
  busy?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onSetDefault?: () => void;
  onOpenFull?: string;
  href?: string;
}) {
  const { t } = useT();
  return (
    <div
      className={`rounded-2xl border bg-card p-4 space-y-3 transition-opacity ${
        busy ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="font-medium text-sm hover:underline line-clamp-1">
              {name}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="font-medium text-sm hover:underline line-clamp-1 text-left"
            >
              {name}
            </button>
          )}
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {badge ? <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> : null}
              {subtitle}
            </p>
          ) : null}
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium">
            {t("Default", "Default")}
          </span>
        ) : null}
      </div>

      {preview ? (
        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
          {preview}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">{t("Tanpa preview", "No preview")}</p>
      )}

      <div className="flex flex-wrap gap-1 pt-1 border-t">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          {t("Edit", "Edit")}
        </Button>
        {onOpenFull ? (
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link href={onOpenFull}>
              <Maximize2 className="h-3.5 w-3.5 mr-1" />
              {t("Penuh", "Full")}
            </Link>
          </Button>
        ) : null}
        {onDuplicate ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            {t("Duplikat", "Duplicate")}
          </Button>
        ) : null}
        {onSetDefault ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onSetDefault}
          >
            <Star className="h-3.5 w-3.5 mr-1" />
            {t("Default", "Default")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          {t("Hapus", "Delete")}
        </Button>
      </div>
    </div>
  );
}
