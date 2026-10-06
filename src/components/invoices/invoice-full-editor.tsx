"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Plus, Check, Loader2, Columns, X } from "lucide-react";
import { toast } from "sonner";
import { saveInvoiceEditor } from "@/lib/actions/invoices";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type Line = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  sourceType?: string | null;
  customValues?: Record<string, string>;
};

export type CustomColumn = {
  key: string;
  label: string;
};

type Option = { id: string; name: string; email?: string | null; clientId?: string | null };

export function InvoiceFullEditor({ invoice, initialItems, clients, projects, sourceActions, children }: {
  invoice: {
    id: string;
    clientId: string;
    projectId: string | null;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string | null;
    currency: string;
    discount: number;
    tax: number;
    chargeType: "none" | "tax" | "admin_fee";
    includeClientCompany?: boolean;
    customColumns?: CustomColumn[];
    notes: string;
    terms: string;
    status: string;
  };
  initialItems: Line[];
  clients: Option[];
  projects: Option[];
  sourceActions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t } = useT();
  const router = useRouter();
  const sourceBacked = initialItems.some((item) => item.sourceType === "time_entry" || item.sourceType === "project");
  const locked = ["cancelled", "archived"].includes(invoice.status);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const isFirstRender = useRef(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [chargeType, setChargeType] = useState<"none" | "tax" | "admin_fee">(invoice.chargeType);
  const [taxPercent, setTaxPercent] = useState<string>(() => {
    if (invoice.chargeType === "tax" && invoice.tax > 0) {
      const sub = initialItems.reduce((sum, item) => sum + Number(item.amount ?? Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
      if (sub > 0) {
        return String(Math.round((invoice.tax / sub) * 100 * 100) / 100);
      }
    }
    return invoice.chargeType === "tax" ? String(invoice.tax || "") : "";
  });

  // Column Labels customisation
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(invoice.customColumns || []);
  const [descLabel, setDescLabel] = useState(() => {
    const found = (invoice.customColumns || []).find((c) => c.key === "description");
    return found ? found.label : "";
  });
  const [qtyLabel, setQtyLabel] = useState(() => {
    const found = (invoice.customColumns || []).find((c) => c.key === "quantity");
    return found ? found.label : "";
  });
  const [rateLabel, setRateLabel] = useState(() => {
    const found = (invoice.customColumns || []).find((c) => c.key === "unitPrice");
    return found ? found.label : "";
  });
  const [isEditingHeaders, setIsEditingHeaders] = useState(false);

  const [form, setForm] = useState({
    ...invoice,
    discount: invoice.discount === 0 ? "" : String(invoice.discount),
    includeClientCompany: invoice.includeClientCompany ?? true,
    items: initialItems.map(({ description, quantity, unitPrice, amount, sourceType, customValues }) => ({
      description,
      quantity,
      unitPrice,
      amount,
      sourceType,
      customValues: customValues || {},
    })),
  });

  const selectedClient = clients.find((c) => c.id === form.clientId);

  useEffect(() => {
    setForm((curr) => ({
      ...curr,
      items: initialItems.map(({ description, quantity, unitPrice, amount, sourceType, customValues }) => ({
        description,
        quantity,
        unitPrice,
        amount,
        sourceType,
        customValues: customValues || {},
      })),
    }));
  }, [initialItems]);

  const clientProjects = projects.filter((project) => project.clientId === form.clientId);
  const subtotal = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.amount ?? Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0), [form.items]);

  const calculatedTaxAmount = useMemo(() => {
    if (chargeType === "none") return 0;
    if (chargeType === "tax") {
      const pct = Number(taxPercent) || 0;
      return (subtotal * pct) / 100;
    }
    return Number(form.tax) || 0;
  }, [chargeType, taxPercent, subtotal, form.tax]);

  const total = Math.max(0, subtotal - (Number(form.discount) || 0) + calculatedTaxAmount);

  // Compile active columns
  const effectiveColumns = useMemo(() => {
    const cols: CustomColumn[] = [];
    if (descLabel) cols.push({ key: "description", label: descLabel });
    if (qtyLabel) cols.push({ key: "quantity", label: qtyLabel });
    if (rateLabel) cols.push({ key: "unitPrice", label: rateLabel });
    customColumns.forEach((c) => {
      if (!["description", "quantity", "unitPrice"].includes(c.key)) {
        cols.push(c);
      }
    });
    return cols;
  }, [descLabel, qtyLabel, rateLabel, customColumns]);

  const updateLine = (index: number, key: keyof Line, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: key === "description" ? value : Number(value) || 0,
            }
          : item
      ),
    }));
  };

  const updateCustomValue = (index: number, colKey: string, val: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              customValues: {
                ...(item.customValues || {}),
                [colKey]: val,
              },
            }
          : item
      ),
    }));
  };

  const addCustomColumn = () => {
    const colName = prompt(t("Masukkan nama kolom baru:", "Enter new column name:"));
    if (!colName || !colName.trim()) return;
    const colKey = `col_${Date.now()}`;
    setCustomColumns((curr) => [...curr, { key: colKey, label: colName.trim() }]);
  };

  const removeCustomColumn = (keyToRemove: string) => {
    setCustomColumns((curr) => curr.filter((c) => c.key !== keyToRemove));
    setForm((curr) => ({
      ...curr,
      items: curr.items.map((it) => {
        const nextCv = { ...(it.customValues || {}) };
        delete nextCv[keyToRemove];
        return { ...it, customValues: nextCv };
      }),
    }));
  };

  const addEmptyLine = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        { description: "", quantity: 1, unitPrice: 0, amount: 0, sourceType: "manual", customValues: {} },
      ],
    }));
  };

  const executeSave = useCallback(async (isSilent = false) => {
    if (locked) return;
    if (!isSilent) setSaving(true);
    setAutoSaveStatus("saving");
    try {
      await saveInvoiceEditor(invoice.id, {
        clientId: form.clientId,
        projectId: form.projectId || null,
        invoiceNumber: form.invoiceNumber,
        issueDate: form.issueDate,
        dueDate: form.dueDate || null,
        currency: form.currency,
        discount: Number(form.discount) || 0,
        tax: calculatedTaxAmount,
        status: form.status as "draft" | "sent" | "viewed" | "overdue",
        chargeType,
        includeClientCompany: form.includeClientCompany,
        customColumns: effectiveColumns,
        notes: form.notes,
        terms: form.terms,
        items: form.items,
      });
      setAutoSaveStatus("saved");
      if (!isSilent) {
        toast.success(t("Invoice disimpan", "Invoice saved"));
        router.refresh();
      }
    } catch (error) {
      setAutoSaveStatus("idle");
      if (!isSilent) {
        toast.error(error instanceof Error ? error.message : t("Gagal menyimpan invoice", "Failed to save invoice"));
      }
    } finally {
      if (!isSilent) setSaving(false);
    }
  }, [locked, invoice.id, form, calculatedTaxAmount, chargeType, effectiveColumns, t, router]);

  // Debounced auto-save effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (locked) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus("idle");

    autoSaveTimerRef.current = setTimeout(() => {
      void executeSave(true);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, chargeType, taxPercent, effectiveColumns, executeSave, locked]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 min-w-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("Detail Invoice", "Invoice Details")}</CardTitle>
            <div className="flex items-center gap-2">
              {autoSaveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  {t("Menyimpan...", "Saving...")}
                </span>
              )}
              {autoSaveStatus === "saved" && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="h-3.5 w-3.5" />
                  {t("Tersimpan otomatis", "Auto-saved")}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="invoice-number">{t("Nomor Invoice", "Invoice Number")}</Label>
              <Input id="invoice-number" value={form.invoiceNumber} disabled={locked} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("Klien", "Client")}</Label>
                {selectedClient && !selectedClient.email && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    {t("Email belum diisi", "Email missing")}
                  </span>
                )}
              </div>
              <Select value={form.clientId} disabled={locked || sourceBacked} onValueChange={(clientId) => setForm({ ...form, clientId, projectId: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Proyek", "Project")}</Label>
              <Select value={form.projectId || "none"} disabled={locked || sourceBacked} onValueChange={(projectId) => setForm({ ...form, projectId: projectId === "none" ? null : projectId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("Tanpa proyek", "No project")}</SelectItem>
                  {clientProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-date">{t("Tanggal Terbit", "Issue Date")}</Label>
              <Input id="issue-date" type="date" value={form.issueDate} disabled={locked} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">{t("Jatuh Tempo", "Due Date")}</Label>
              <Input id="due-date" type="date" value={form.dueDate || ""} disabled={locked} onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t("Mata Uang", "Currency")}</Label>
              <Select value={form.currency} disabled={locked} onValueChange={(currency) => setForm({ ...form, currency })}>
                <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR (Rp)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="SGD">SGD (S$)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label htmlFor="include-company" className="text-sm font-medium cursor-pointer">
                  {t("Cantumkan Nama Perusahaan Klien", "Include Client Company Name")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("Jika aktif, nama perusahaan klien ditampilkan di bawah nama klien pada invoice.", "When enabled, client company name is shown below client name on invoice.")}
                </p>
              </div>
              <input
                id="include-company"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                checked={form.includeClientCompany}
                disabled={locked}
                onChange={(e) => setForm({ ...form, includeClientCompany: e.target.checked })}
              />
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>{t("Rincian Item", "Line Items")}</CardTitle>
              {sourceBacked && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Item sumber dikelola dari proyek atau time entry.", "Source items are managed from project or time entries.")}
                </p>
              )}
            </div>
            {!locked && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingHeaders(!isEditingHeaders)}
                  className="gap-1 text-xs"
                >
                  <Columns className="h-3.5 w-3.5" />
                  {isEditingHeaders ? t("Selesai Kustomisasi", "Done Editing") : t("Kustom Header", "Edit Headers")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCustomColumn}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("Tambah Kolom", "Add Column")}
                </Button>
                <Button type="button" size="sm" variant="default" onClick={addEmptyLine} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> {t("Baris Baru", "Add Row")}
                </Button>
                {sourceActions}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {isEditingHeaders && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                <p className="text-xs font-semibold text-primary">
                  {t("Kustomisasi Nama Kolom (Header):", "Customize Column Labels:")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("Header Deskripsi", "Description Header")}</Label>
                    <Input
                      placeholder={t("Deskripsi", "Description")}
                      value={descLabel}
                      onChange={(e) => setDescLabel(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("Header Qty / Jumlah", "Qty Header")}</Label>
                    <Input
                      placeholder="Qty"
                      value={qtyLabel}
                      onChange={(e) => setQtyLabel(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("Header Tarif / Harga", "Rate Header")}</Label>
                    <Input
                      placeholder={t("Tarif", "Rate")}
                      value={rateLabel}
                      onChange={(e) => setRateLabel(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {customColumns.filter((c) => !["description", "quantity", "unitPrice"].includes(c.key)).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-primary/20">
                    <Label className="text-[11px] text-muted-foreground">{t("Kolom Tambahan Aktif:", "Additional Columns:")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {customColumns.filter((c) => !["description", "quantity", "unitPrice"].includes(c.key)).map((col) => (
                        <div key={col.key} className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs">
                          <span>{col.label}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomColumn(col.key)}
                            className="text-muted-foreground hover:text-destructive cursor-pointer"
                            title={t("Hapus Kolom", "Remove Column")}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("Belum ada item.", "No items yet.")}</p>
            )}
            {form.items.map((item, index) => {
              const extraCols = customColumns.filter((c) => !["description", "quantity", "unitPrice"].includes(c.key));
              return (
                <div key={index} className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-xs">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px_150px_40px] sm:items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">{descLabel || t("Deskripsi", "Description")}</Label>
                      <Input
                        aria-label={`${descLabel || t("Deskripsi", "Description")} ${index + 1}`}
                        value={item.description}
                        placeholder={t("Deskripsi pekerjaan / item", "Item description")}
                        disabled={locked || sourceBacked}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{qtyLabel || "Qty"}</Label>
                      <Input
                        aria-label={`${qtyLabel || "Qty"} ${index + 1}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity === 0 ? "" : item.quantity}
                        disabled={locked || sourceBacked}
                        onChange={(e) => updateLine(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{rateLabel || t("Tarif", "Rate")}</Label>
                      <Input
                        aria-label={`${rateLabel || t("Tarif", "Rate")} ${index + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                        placeholder="0"
                        disabled={locked || sourceBacked}
                        onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                      />
                    </div>
                    {!sourceBacked && !locked && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`${t("Hapus item", "Delete item")} ${index + 1}`}
                        onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Extra custom columns rendered under the main line */}
                  {extraCols.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/40">
                      {extraCols.map((col) => (
                        <div key={col.key} className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{col.label}</Label>
                          <Input
                            placeholder={`${col.label}...`}
                            value={item.customValues?.[col.key] || ""}
                            disabled={locked || sourceBacked}
                            onChange={(e) => updateCustomValue(index, col.key, e.target.value)}
                            className="h-8 text-xs bg-muted/20"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("Catatan & Ketentuan", "Notes & Terms")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-notes">{t("Catatan", "Notes")}</Label>
              <Textarea id="invoice-notes" rows={5} value={form.notes} disabled={locked} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-terms">{t("Ketentuan", "Terms")}</Label>
              <Textarea id="invoice-terms" rows={5} value={form.terms} disabled={locked} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader><CardTitle>{t("Ringkasan", "Summary")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{t("Subtotal", "Subtotal")}</span>
              <strong className="font-mono">{formatMoney(subtotal, form.currency)}</strong>
            </div>
            <div className="space-y-1">
              <Label htmlFor="invoice-discount">{t("Diskon", "Discount")}</Label>
              <Input
                id="invoice-discount"
                type="number"
                min="0"
                value={form.discount}
                placeholder="0"
                disabled={locked}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("Biaya Tambahan", "Additional Charge")}</Label>
              <Select
                value={chargeType}
                disabled={locked}
                onValueChange={(value: "none" | "tax" | "admin_fee") => {
                  setChargeType(value);
                  if (value === "none") {
                    setTaxPercent("");
                    setForm({ ...form, tax: 0 });
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("Tanpa Pajak / Biaya", "No Tax / Fee")}</SelectItem>
                  <SelectItem value="tax">{t("Pajak (%)", "Tax (%)")}</SelectItem>
                  <SelectItem value="admin_fee">{t("Biaya Admin (Nominal)", "Admin Fee (Fixed)")}</SelectItem>
                </SelectContent>
              </Select>
              {chargeType === "tax" && (
                <div className="relative mt-1.5">
                  <Input
                    aria-label={t("Pajak (%)", "Tax (%)")}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 11"
                    value={taxPercent}
                    disabled={locked}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-muted-foreground">%</span>
                </div>
              )}
              {chargeType === "admin_fee" && (
                <Input
                  aria-label={t("Biaya Admin", "Admin Fee")}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.tax === 0 ? "" : form.tax}
                  disabled={locked}
                  onChange={(e) => setForm({ ...form, tax: Number(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              )}
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Total</span>
              <strong className="font-mono text-lg">{formatMoney(total, form.currency)}</strong>
            </div>
            <LoadingButton onClick={() => void executeSave(false)} loading={saving} disabled={locked} className="w-full">
              <Save className="h-4 w-4 mr-2" />{t("Simpan Manual", "Save Changes")}
            </LoadingButton>
          </CardContent>
        </Card>
        {children}
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur xl:hidden">
        <LoadingButton onClick={() => void executeSave(false)} loading={saving} disabled={locked} className="w-full">
          <Save className="h-4 w-4 mr-2" />{t("Simpan Manual", "Save Changes")}
        </LoadingButton>
      </div>
    </div>
  );
}
