"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useT } from "@/lib/i18n-client";

type Item = { description: string; quantity: number; unitPrice: number };
type Props = {
  kind: "proposal" | "contract";
  initial: { clientName: string; clientEmail: string; companyName: string; title: string; contractNumber?: string | null; validUntil?: string | null; downPaymentPercent?: number; taxRate?: number; lineItems?: Item[] };
  update: (input: Record<string, unknown>) => Promise<unknown>;
};

export function DocumentDetailsForm({ kind, initial, update }: Props) {
  const { t } = useT();
  const [value, setValue] = useState({ ...initial, validUntil: initial.validUntil ?? "", downPaymentPercent: initial.downPaymentPercent ?? 0, taxRate: initial.taxRate ?? 0, lineItems: initial.lineItems ?? [] });
  const [pending, startTransition] = useTransition();
  function patchItem(index: number, patch: Partial<Item>) { setValue((v) => ({ ...v, lineItems: v.lineItems.map((item, i) => i === index ? { ...item, ...patch } : item) })); }
  const subtotal = value.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * (value.taxRate / 100);
  const total = subtotal + tax;
  return <form className="rounded-lg border bg-white p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); startTransition(async () => { try { await update({ ...value, clientEmail: value.clientEmail || null, companyName: value.companyName || null, validUntil: value.validUntil || null, ...(kind === "proposal" ? { lineItems: value.lineItems.map((item) => ({ ...item, amount: item.quantity * item.unitPrice })), taxRate: value.taxRate, downPaymentPercent: value.downPaymentPercent } : {}) }); toast.success(kind === "proposal" ? t("Detail proposal tersimpan", "Proposal details saved") : t("Detail kontrak tersimpan", "Contract details saved")); } catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal menyimpan", "Save failed")); } }); }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label>{t("Nama client", "Client name")}</Label><Input value={value.clientName} onChange={e => setValue(v => ({ ...v, clientName: e.target.value }))} required /></div>
      <div><Label>{t("Email client", "Client email")}</Label><Input type="email" value={value.clientEmail} onChange={e => setValue(v => ({ ...v, clientEmail: e.target.value }))} /></div>
      <div><Label>{t("Nama perusahaan", "Company name")}</Label><Input value={value.companyName} onChange={e => setValue(v => ({ ...v, companyName: e.target.value }))} /></div>
      <div><Label>{t("Judul", "Title")}</Label><Input value={value.title} onChange={e => setValue(v => ({ ...v, title: e.target.value }))} required /></div>
      {kind === "contract" && <div><Label>{t("Nomor kontrak", "Contract number")}</Label><Input value={value.contractNumber ?? ""} placeholder="CONT-2026-0001" onChange={e => setValue(v => ({ ...v, contractNumber: e.target.value }))} /></div>}
      <div><Label>{t("Berlaku sampai", "Valid until")}</Label><Input type="date" value={value.validUntil} onChange={e => setValue(v => ({ ...v, validUntil: e.target.value }))} /></div>
      {kind === "proposal" && <>
        <div><Label>{t("Pajak (%)", "Tax (%)")}</Label><Input type="number" min="0" max="100" value={value.taxRate} onChange={e => setValue(v => ({ ...v, taxRate: Number(e.target.value) || 0 }))} /></div>
        <div><Label>{t("DP (%)", "Down payment (%)")}</Label><Input type="number" min="0" max="100" value={value.downPaymentPercent} onChange={e => setValue(v => ({ ...v, downPaymentPercent: Number(e.target.value) || 0 }))} /></div>
      </>}
    </div>
    {kind === "proposal" && <div className="space-y-2 border-t pt-3"><p className="text-sm font-medium">{t("Rincian harga", "Pricing details")}</p>{value.lineItems.map((item, i) => <div className="grid gap-2 sm:grid-cols-[1fr_90px_140px]" key={i}><Input aria-label={t("Deskripsi item", "Item description")} value={item.description} onChange={e => patchItem(i, { description: e.target.value })} /><Input aria-label="Qty" type="number" min="0" step="0.5" value={item.quantity} onChange={e => patchItem(i, { quantity: Number(e.target.value) || 0 })} /><Input aria-label={t("Harga satuan", "Unit price")} type="number" min="0" value={item.unitPrice} onChange={e => patchItem(i, { unitPrice: Number(e.target.value) || 0 })} /></div>)}<div className="text-right text-sm text-muted-foreground">{t("Total", "Total")}: {total.toLocaleString("id-ID")} · {t("DP", "DP")}: {(total * value.downPaymentPercent / 100).toLocaleString("id-ID")}</div></div>}
    <Button type="submit" disabled={pending}>{pending ? t("Menyimpan...", "Saving...") : t("Simpan detail", "Save details")}</Button>
  </form>;
}

export default DocumentDetailsForm;
