"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Trash2, Link2 } from "lucide-react";
import { updateWorkspaceBranding } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n-client";

interface WorkspaceBrandingFormProps {
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
  /** Shown as hint when replyToEmail empty — auto fallback target. */
  ownerEmailHint?: string | null;
}

export function WorkspaceBrandingForm({
  defaults,
  ownerEmailHint,
}: WorkspaceBrandingFormProps) {
  const { t } = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [form, setForm] = useState({
    billingName: defaults.billingName ?? "",
    billingEmail: defaults.billingEmail ?? "",
    billingPhone: defaults.billingPhone ?? "",
    billingAddress: defaults.billingAddress ?? "",
    taxId: defaults.taxId ?? "",
    logoUrl: defaults.logoUrl ?? "",
    defaultCurrency: defaults.defaultCurrency ?? "IDR",
    defaultTaxRate: defaults.defaultTaxRate != null ? String(defaults.defaultTaxRate) : "0",
    defaultHourlyRate:
      defaults.defaultHourlyRate != null ? String(defaults.defaultHourlyRate) : "",
    defaultInvoiceTerms: defaults.defaultInvoiceTerms ?? "",

    replyToEmail: defaults.replyToEmail ?? "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
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
      toast.success(t("Branding disimpan", "Branding saved"));
      router.refresh();
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
    if (!file.type.startsWith("image/")) {
      toast.error(t("File harus gambar", "File must be an image"));
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
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Upload logo gagal", "Logo upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveLogo() {
    setUploading(true);
    try {
      const res = await fetch("/api/workspace/logo", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("Gagal hapus logo", "Failed to remove logo"));
      }
      setForm((p) => ({ ...p, logoUrl: "" }));
      toast.success(t("Logo dihapus", "Logo removed"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal hapus logo", "Failed to remove logo"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Label>{t("Logo invoice", "Invoice logo")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Upload PNG/JPG/WebP/SVG, max 2MB. Muncul di PDF + preview klien.",
                "Upload PNG/JPG/WebP/SVG, max 2MB. Shows on PDF + client preview.",
              )}
            </p>
          </div>
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoUrl}
              alt="Logo preview"
              className="h-14 w-14 rounded-lg border bg-muted object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-xs text-muted-foreground">
              —
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => onUploadLogo(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {uploading
              ? t("Mengupload…", "Uploading…")
              : form.logoUrl
                ? t("Ganti logo", "Replace logo")
                : t("Upload logo", "Upload logo")}
          </Button>
          {form.logoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              className="gap-1.5 text-destructive"
              onClick={onRemoveLogo}
            >
              <Trash2 className="h-4 w-4" />
              {t("Hapus", "Remove")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowUrl((v) => !v)}
          >
            <Link2 className="h-4 w-4" />
            {showUrl
              ? t("Sembunyikan URL", "Hide URL")
              : t("Atau pakai URL", "Or use URL")}
          </Button>
        </div>

        {showUrl ? (
          <div className="space-y-2">
            <Label htmlFor="logoUrl">{t("URL logo (opsional)", "Logo URL (optional)")}</Label>
            <Input
              id="logoUrl"
              type="url"
              value={form.logoUrl}
              onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
              placeholder="https://.../logo.png"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Kalau ada file sendiri di CDN, paste URL di sini lalu Simpan branding.",
                "If you already host the file on a CDN, paste URL here then Save branding.",
              )}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billingName">{t("Nama tagihan", "Billing name")}</Label>
          <Input
            id="billingName"
            value={form.billingName}
            onChange={(e) => setForm((p) => ({ ...p, billingName: e.target.value }))}
            placeholder="PT Contoh / Nama freelancermu"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingEmail">{t("Email tagihan", "Billing email")}</Label>
          <Input
            id="billingEmail"
            type="email"
            value={form.billingEmail}
            onChange={(e) => setForm((p) => ({ ...p, billingEmail: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="replyToEmail">{t("Email balasan klien", "Client reply-to email")}</Label>
          <Input
            id="replyToEmail"
            type="email"
            value={form.replyToEmail}
            onChange={(e) => setForm((p) => ({ ...p, replyToEmail: e.target.value }))}
            placeholder={
              form.billingEmail ||
              ownerEmailHint ||
              "email-kamu@gmail.com"
            }
          />
          <p className="text-xs text-muted-foreground">
            {t(
              "Balasan klien ke invoice/booking masuk sini. Kosong = email tagihan, lalu email owner.",
              "Client replies to invoices/bookings go here. Empty = billing email, then owner email.",
            )}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingPhone">{t("Telepon", "Phone")}</Label>
          <Input
            id="billingPhone"
            value={form.billingPhone}
            onChange={(e) => setForm((p) => ({ ...p, billingPhone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxId">Tax ID / NPWP</Label>
          <Input
            id="taxId"
            value={form.taxId}
            onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="billingAddress">{t("Alamat", "Address")}</Label>
          <Textarea
            id="billingAddress"
            rows={3}
            value={form.billingAddress}
            onChange={(e) => setForm((p) => ({ ...p, billingAddress: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultCurrency">{t("Mata uang default", "Default currency")}</Label>
          <select
            id="defaultCurrency"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
        <div className="space-y-2">
          <Label htmlFor="defaultTaxRate">{t("Pajak default %", "Default tax %")}</Label>
          <Input
            id="defaultTaxRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.defaultTaxRate}
            onChange={(e) => setForm((p) => ({ ...p, defaultTaxRate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultHourlyRate">
            {t("Tarif per jam default", "Default hourly rate")}
          </Label>
          <Input
            id="defaultHourlyRate"
            type="number"
            min="0"
            step="0.01"
            value={form.defaultHourlyRate}
            onChange={(e) => setForm((p) => ({ ...p, defaultHourlyRate: e.target.value }))}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            {t(
              "Dipakai saat import waktu ke invoice jika entry/project rate kosong.",
              "Used when importing time to invoice if entry/project rate is empty.",
            )}
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="defaultInvoiceTerms">
            {t("Syarat invoice default", "Default invoice terms")}
          </Label>
          <Textarea
            id="defaultInvoiceTerms"
            rows={3}
            value={form.defaultInvoiceTerms}
            onChange={(e) => setForm((p) => ({ ...p, defaultInvoiceTerms: e.target.value }))}
          />
        </div>

      </div>

      <Button type="submit" disabled={loading || uploading}>
        {loading ? t("Menyimpan…", "Saving…") : t("Simpan branding", "Save branding")}
      </Button>
    </form>
  );
}
