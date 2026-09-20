"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { ImagePlus, Trash2, Link2, Sparkles, Building2 } from "lucide-react";
import { updateWorkspaceBranding, updateWorkspaceName } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n-client";
import { useConfirm } from "@/lib/hooks/use-confirm";

interface WorkspaceBrandingFormProps {
  section: "workspace" | "invoice";
  canEdit?: boolean;
  plan?: "free" | "solo" | "team";
  workspaceName?: string;
  defaults: {
    billingName?: string | null;
    billingEmail?: string | null;
    billingPhone?: string | null;
    billingAddress?: string | null;
    taxId?: string | null;
    logoUrl?: string | null;
    defaultCurrency?: string | null;
    defaultTaxRate?: string | number | null;
    defaultHourlyRate?: string | number | null;
    defaultInvoiceTerms?: string | null;
    replyToEmail?: string | null;
  };
}

export function WorkspaceBrandingForm({
  section,
  defaults,
  workspaceName = "",
  canEdit = true,
  plan = "free",
}: WorkspaceBrandingFormProps) {
  const canCustomizeLogo = plan !== "free";
  const { t } = useT();
  const { refresh } = useAppTransition();
  const { confirm, dialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wsName, setWsName] = useState(workspaceName);
  const [form, setForm] = useState({
    billingName: defaults.billingName ?? "",
    billingEmail: defaults.billingEmail ?? "",
    billingPhone: defaults.billingPhone ?? "",
    billingAddress: defaults.billingAddress ?? "",
    taxId: defaults.taxId ?? "",
    logoUrl: defaults.logoUrl ?? "",
    defaultCurrency: defaults.defaultCurrency ?? "IDR",
    defaultTaxRate: defaults.defaultTaxRate != null ? String(defaults.defaultTaxRate) : "0",
    defaultHourlyRate: defaults.defaultHourlyRate != null ? String(defaults.defaultHourlyRate) : "",
    defaultInvoiceTerms: defaults.defaultInvoiceTerms ?? "",
    replyToEmail: defaults.replyToEmail ?? "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (section === "workspace" && wsName.trim() && wsName.trim() !== workspaceName) {
        await updateWorkspaceName({ name: wsName.trim() });
      }

      await updateWorkspaceBranding({
        billingName: form.billingName,
        billingEmail: form.billingEmail,
        billingPhone: form.billingPhone,
        billingAddress: form.billingAddress,
        taxId: form.taxId,
        logoUrl: form.logoUrl || "",
        defaultCurrency: form.defaultCurrency || "IDR",
        defaultTaxRate: Number(form.defaultTaxRate || 0),
        defaultHourlyRate: form.defaultHourlyRate ? Number(form.defaultHourlyRate) : null,
        defaultInvoiceTerms: form.defaultInvoiceTerms,
        replyToEmail: form.replyToEmail,
      });

      toast.success(
        section === "workspace"
          ? t("Pengaturan workspace disimpan", "Workspace settings saved")
          : t("Default invoice disimpan", "Invoice defaults saved")
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan", "Save failed"));
    } finally {
      setLoading(false);
    }
  }

  async function onUploadLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("Logo max 2MB", "Logo max 2MB"));
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      toast.error(t("Format logo harus PNG, JPG, WebP, atau GIF", "Logo must be PNG, JPG, WebP, or GIF"));
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/workspace/logo", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; logoUrl?: string; error?: string };
      if (!res.ok || !data.ok || !data.logoUrl) {
        throw new Error(data.error || t("Upload logo gagal", "Logo upload failed"));
      }
      setForm((p) => ({ ...p, logoUrl: data.logoUrl! }));
      toast.success(t("Logo diupload", "Logo uploaded"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Upload logo gagal", "Logo upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveLogo() {
    const ok = await confirm({
      title: t("Hapus logo?", "Remove logo?"),
      description: t("Hapus logo workspace?", "Remove workspace logo?"),
      confirmLabel: t("Hapus", "Remove"),
      destructive: true,
    });
    if (!ok) return;
    setUploading(true);
    try {
      const res = await fetch("/api/workspace/logo", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("Gagal hapus logo", "Failed to remove logo"));
      }
      setForm((p) => ({ ...p, logoUrl: "" }));
      toast.success(t("Logo dihapus", "Logo removed"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal hapus logo", "Failed to remove logo"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {dialog}
      <form onSubmit={onSubmit} className="space-y-6">
        <fieldset disabled={!canEdit} className="space-y-6">
          {section === "workspace" ? (
            <>
              {/* SECTION: IDENTITAS WORKSPACE & LOGO */}
              <div className="grid gap-6 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="ws-name" className="text-sm font-semibold text-slate-900">
                      {t("Nama Workspace", "Workspace Name")}
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("Nama ruang kerja utama kamu di Cubiqlo.", "Your primary team or solo workspace.")}
                    </p>
                  </div>
                  <Input
                    id="ws-name"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder={t("Nama workspace...", "Workspace name...")}
                    className="h-10 rounded-xl bg-white"
                  />
                </div>

                {/* LOGO BOX */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-slate-900">
                        {t("Logo Bisnis", "Business Logo")}
                      </Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("Muncul di PDF invoice & preview klien.", "Shows on invoices & client previews.")}
                      </p>
                    </div>
                    {!canCustomizeLogo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Sparkles className="h-3 w-3" /> Solo / Team
                      </span>
                    )}
                  </div>

                  {!canCustomizeLogo ? (
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-muted-foreground">
                      <span>{t("Upgrade untuk pasang logo kustom.", "Upgrade to display custom logo.")}</span>
                      <a href="/app/billing" className="font-semibold text-primary hover:underline">
                        {t("Upgrade →", "Upgrade →")}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {form.logoUrl ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm">
                          <Image src={form.logoUrl} alt="Logo" fill sizes="48px" className="object-contain p-1" />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                          <ImagePlus className="h-5 w-5" />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => onUploadLogo(e.target.files?.[0])}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploading || !canEdit}
                          className="h-8 rounded-lg text-xs"
                          onClick={() => fileRef.current?.click()}
                        >
                          {uploading ? t("Upload...", "Uploading...") : form.logoUrl ? t("Ganti", "Replace") : t("Upload", "Upload")}
                        </Button>
                        {form.logoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={uploading || !canEdit}
                            className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                            onClick={onRemoveLogo}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-xs text-muted-foreground"
                          onClick={() => setShowUrl((v) => !v)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {showUrl && canCustomizeLogo && (
                    <Input
                      type="url"
                      value={form.logoUrl}
                      onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                      placeholder="https://.../logo.png"
                      className="h-9 rounded-lg text-xs"
                    />
                  )}
                </div>
              </div>

              {/* SECTION: DETAIL PROFIL BISNIS */}
              <div data-testid="workspace-business-group" className="space-y-4 pt-1">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-900">{t("Detail Profil & Tagihan Bisnis", "Business & Billing Details")}</h4>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="billingName" className="text-xs font-medium text-slate-700">{t("Nama Perusahaan / Brand", "Company or Brand Name")}</Label>
                    <Input
                      id="billingName"
                      value={form.billingName}
                      onChange={(e) => setForm((p) => ({ ...p, billingName: e.target.value }))}
                      placeholder={t("PT Contoh / Nama Freelancer", "Company or Freelancer Name")}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="billingEmail" className="text-xs font-medium text-slate-700">{t("Email Tagihan Bisnis", "Billing Email")}</Label>
                    <Input
                      id="billingEmail"
                      type="email"
                      value={form.billingEmail}
                      onChange={(e) => setForm((p) => ({ ...p, billingEmail: e.target.value }))}
                      placeholder="billing@company.com"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="billingPhone" className="text-xs font-medium text-slate-700">{t("Nomor Telepon", "Phone Number")}</Label>
                    <Input
                      id="billingPhone"
                      value={form.billingPhone}
                      onChange={(e) => setForm((p) => ({ ...p, billingPhone: e.target.value }))}
                      placeholder="+62 812..."
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxId" className="text-xs font-medium text-slate-700">{t("NPWP / Tax ID", "Tax ID / NPWP")}</Label>
                    <Input
                      id="taxId"
                      value={form.taxId}
                      onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                      placeholder="00.000.000.0-000.000"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="billingAddress" className="text-xs font-medium text-slate-700">{t("Alamat Bisnis", "Business Address")}</Label>
                    <Textarea
                      id="billingAddress"
                      rows={2}
                      value={form.billingAddress}
                      onChange={(e) => setForm((p) => ({ ...p, billingAddress: e.target.value }))}
                      placeholder={t("Alamat lengkap kantor atau domisili...", "Full business address...")}
                      className="rounded-xl resize-none text-xs"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {/* SECTION: INVOICE TAB */}
          {section === "invoice" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="replyToEmail" className="text-xs font-medium text-slate-700">
                  {t("Email Balasan Klien (Reply-To)", "Client Reply-To Email")}
                </Label>
                <Input
                  id="replyToEmail"
                  type="email"
                  value={form.replyToEmail}
                  onChange={(e) => setForm((p) => ({ ...p, replyToEmail: e.target.value }))}
                  placeholder={t("invoice@bisnismu.com", "invoice@yourbusiness.com")}
                  className="h-10 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "Balasan invoice/booking klien akan dikirim ke email ini.",
                    "Client replies to invoices/bookings will be directed here.",
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultCurrency" className="text-xs font-medium text-slate-700">
                  {t("Mata Uang Utama", "Default Currency")}
                </Label>
                <select
                  id="defaultCurrency"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                  value={form.defaultCurrency}
                  onChange={(e) => setForm((p) => ({ ...p, defaultCurrency: e.target.value }))}
                >
                  {["IDR", "USD", "EUR", "SGD", "AUD", "GBP", "MYR", "JPY"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultTaxRate" className="text-xs font-medium text-slate-700">
                  {t("Pajak Default (%)", "Default Tax Rate (%)")}
                </Label>
                <Input
                  id="defaultTaxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.defaultTaxRate}
                  onChange={(e) => setForm((p) => ({ ...p, defaultTaxRate: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="defaultHourlyRate" className="text-xs font-medium text-slate-700">
                  {t("Tarif Per Jam Default (Hourly Rate)", "Default Hourly Rate")}
                </Label>
                <Input
                  id="defaultHourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.defaultHourlyRate}
                  onChange={(e) => setForm((p) => ({ ...p, defaultHourlyRate: e.target.value }))}
                  placeholder="0"
                  className="h-10 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "Digunakan saat import waktu kerja ke invoice jika rate proyek kosong.",
                    "Used when importing tracked time to invoice if project rate is not set.",
                  )}
                </p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="defaultInvoiceTerms" className="text-xs font-medium text-slate-700">
                  {t("Syarat & Catatan Pembayaran", "Payment Terms & Notes")}
                </Label>
                <Textarea
                  id="defaultInvoiceTerms"
                  rows={2}
                  value={form.defaultInvoiceTerms}
                  onChange={(e) => setForm((p) => ({ ...p, defaultInvoiceTerms: e.target.value }))}
                  placeholder={t("Contoh: Pembayaran jatuh tempo dalam 14 hari kerja...", "e.g. Payment due within 14 days...")}
                  className="rounded-xl resize-none text-xs"
                />
              </div>
            </div>
          ) : null}

          <div className="pt-2">
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={t("Menyimpan…", "Saving…")}
              disabled={uploading || !canEdit}
              className="h-10 rounded-xl px-6 font-semibold"
            >
              {saved
                ? t("Tersimpan ✓", "Saved ✓")
                : section === "workspace"
                  ? t("Simpan Perubahan Workspace", "Save Workspace Changes")
                  : t("Simpan Pengaturan Invoice", "Save Invoice Settings")}
            </LoadingButton>
          </div>
        </fieldset>
      </form>
    </>
  );
}
