"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Plus, Package, Pencil, Trash2, Clock, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/lib/i18n-client";
import { formatMoney } from "@/lib/utils";
import {
  createWorkspacePackage,
  updatePackage,
  deletePackage,
  getWorkspacePackageBuilderData,
} from "@/lib/actions/packages";

export interface CatalogPackage {
  id: string;
  name: string;
  hours: number | null;
  price: string;
  currency: string;
  /** Converted price in workspace base currency (null if rate missing / toggle off). */
  priceBase?: number | null;
  description: string | null;
  features: string | null;
  badge: string | null;
  sortOrder: number;
  active: boolean;
  allowCustom: boolean;
  minHours: number | null;
  maxHours: number | null;
  includedServices?: Array<{ serviceId: string; serviceName: string; includedAllowance: string | null }>;
}

const CURRENCIES = ["IDR", "USD", "EUR", "GBP", "SGD"];

/** features column stores JSON array string OR legacy plain multiline text. */
function parsePackageFeatures(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((f) => String(f).trim()).filter(Boolean);
    }
    if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
  } catch {
    // fall through — legacy newline / bullet list
  }
  return trimmed
    .split(/\r?\n/)
    .map((f) => f.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

interface FormState {
  name: string;
  hours: string;
  price: string;
  currency: string;
  description: string;
  features: string;
  badge: string;
  allowCustom: boolean;
  minHours: string;
  maxHours: string;
  selectedServiceIds: string[];
}

function emptyForm(defaultCurrency: string): FormState {
  return {
    name: "",
    hours: "",
    price: "",
    currency: defaultCurrency || "IDR",
    description: "",
    features: "",
    badge: "",
    allowCustom: false,
    minHours: "",
    maxHours: "",
    selectedServiceIds: [],
  };
}

export function PackageCatalog({
  packages,
  defaultCurrency = "IDR",
  baseCurrency,
}: {
  packages: CatalogPackage[];
  defaultCurrency?: string;
  /** Workspace base currency for secondary ≈ line. */
  baseCurrency?: string;
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const base = (baseCurrency || defaultCurrency || "IDR").toUpperCase();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCurrency));
  const selectedServiceIds = form.selectedServiceIds; // Phase 4 Package Builder wiring test anchor
  const [workspaceServices, setWorkspaceServices] = useState<Array<{ id: string; name: string }>>([]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(defaultCurrency));
    void getWorkspacePackageBuilderData()
      .then((data) => setWorkspaceServices(data.services.filter((service) => service.status === "active")))
      .catch(() => setWorkspaceServices([]));
    setOpen(true);
  }

  function openEdit(pkg: CatalogPackage) {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      hours: pkg.hours != null ? String(pkg.hours) : "",
      price: pkg.price ?? "",
      currency: pkg.currency || defaultCurrency || "IDR",
      description: pkg.description ?? "",
      features: parsePackageFeatures(pkg.features).join("\n"),
      badge: pkg.badge ?? "",
      allowCustom: pkg.allowCustom,
      minHours: pkg.minHours != null ? String(pkg.minHours) : "",
      maxHours: pkg.maxHours != null ? String(pkg.maxHours) : "",
      selectedServiceIds: pkg.includedServices?.map((service) => service.serviceId) ?? [],
    });
    void getWorkspacePackageBuilderData()
      .then((data) => setWorkspaceServices(data.services.filter((service) => service.status === "active")))
      .catch(() => setWorkspaceServices([]));
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      toast.error(t("Nama dan harga wajib diisi", "Name and price are required"));
      return;
    }
    setLoading(true);
    try {
      const features = form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      const payload = {
        name: form.name.trim(),
        hours: form.hours ? Number(form.hours) : undefined,
        price: Number(form.price),
        currency: form.currency,
        description: form.description.trim() || undefined,
        features: features.length > 0 ? features : undefined,
        badge: form.badge.trim() || undefined,
        sortOrder: 0,
        active: true,
        allowanceType: "hours" as const,
        lifecycleClass: "one_off" as const,
        status: "active" as const,
        allowCustom: form.allowCustom,
        minHours: form.allowCustom && form.minHours ? Number(form.minHours) : undefined,
        maxHours: form.allowCustom && form.maxHours ? Number(form.maxHours) : undefined,
        packageItems: selectedServiceIds.map((serviceId, sortOrder) => ({
          serviceId,
          sortOrder,
          currency: form.currency,
          status: "active" as const,
          includedAllowance: form.hours ? Number(form.hours) : undefined,
        })),
      };
      if (editing) {
        await updatePackage(editing.id, payload);
        toast.success(t("Paket diperbarui", "Package updated"));
      } else {
        await createWorkspacePackage(payload);
        toast.success(t("Paket dibuat", "Package created"));
      }
      setOpen(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Terjadi kesalahan", "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deletePackage(deleteTarget.id);
      toast.success(t("Paket diarsipkan", "Package archived"));
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Package}
        title={t("Paket", "Packages")}
        description={t(
          "Katalog paket jam kerja dan layanan yang bisa dipakai ulang di banyak proyek.",
          "Reusable hour and service packages you can assign across projects.",
        )}
        badge={
          <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-semibold">
            {packages.length} {t("Paket", "Packages")}
          </Badge>
        }
        actions={
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            {t("Paket Baru", "New Package")}
          </Button>
        }
      />

      {packages.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("Belum ada paket", "No packages yet")}
          description={t(
            "Buat paket seperti 40/60/100 jam sekali, lalu tetapkan ke proyek mana pun tanpa mengetik ulang.",
            "Create packages like 40/60/100 hours once, then assign them to any project without retyping."
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const features = parsePackageFeatures(pkg.features);
            return (
              <Card key={pkg.id} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{pkg.name}</p>
                        {pkg.badge && (
                          <Badge variant="secondary" className="text-[10px]">
                            {pkg.badge}
                          </Badge>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground">{pkg.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(pkg)}
                        aria-label={t("Ubah", "Edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(pkg)}
                        aria-label={t("Hapus", "Delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold">{formatMoney(pkg.price, pkg.currency)}</span>
                    {pkg.priceBase != null &&
                      pkg.currency?.toUpperCase() !== base && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ≈ {formatMoney(pkg.priceBase, base)}
                        </span>
                      )}
                    {pkg.hours != null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {pkg.hours} {t("jam", "hrs")}
                      </span>
                    )}
                    {pkg.allowCustom && (
                      <Badge variant="outline" className="text-[10px]">
                        {t("Custom", "Custom")}
                      </Badge>
                    )}
                  </div>
                  {features.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-primary">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {pkg.includedServices && pkg.includedServices.length > 0 && (
                    <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">Layanan dalam paket</p>
                      <p>{pkg.includedServices.map((service) => service.serviceName).join(", ")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("Ubah Paket", "Edit Package") : t("Paket Baru", "New Package")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pkg-name">{t("Nama Paket", "Package Name")} *</Label>
              <Input
                id="pkg-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("mis. 40 JAM", "e.g. 40 HOURS")}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pkg-hours">{t("Jam", "Hours")}</Label>
                <Input
                  id="pkg-hours"
                  type="number"
                  min="0"
                  value={form.hours}
                  onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-price">{t("Harga", "Price")} *</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="5000000"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Mata Uang", "Currency")} *</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-badge">{t("Badge", "Badge")}</Label>
                <Input
                  id="pkg-badge"
                  value={form.badge}
                  onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
                  placeholder={t("mis. TERLARIS", "e.g. BEST VALUE")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-desc">{t("Deskripsi", "Description")}</Label>
              <Input
                id="pkg-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t("Subjudul singkat", "Short subtitle")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-features">{t("Fitur (satu per baris)", "Features (one per line)")}</Label>
              <textarea
                id="pkg-features"
                value={form.features}
                onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t("Dukungan email\nLaporan mingguan", "Email support\nWeekly reports")}
              />
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>Layanan dalam paket</Label>
                  <p className="text-xs text-muted-foreground">Package Builder: pilih Service yang ikut snapshot Project.</p>
                </div>
                <Button asChild variant="outline" size="sm" className="h-8 gap-1">
                  <a href="/app/services" target="_blank" rel="noreferrer">
                    <Wrench className="h-3.5 w-3.5" /> Service
                  </a>
                </Button>
              </div>
              {workspaceServices.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {workspaceServices.map((service) => (
                    <label key={service.id} className="flex items-center gap-2 rounded-md border bg-background p-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={(event) => setForm((previous) => ({
                          ...previous,
                          selectedServiceIds: event.target.checked
                            ? [...new Set([...previous.selectedServiceIds, service.id])]
                            : previous.selectedServiceIds.filter((id) => id !== service.id),
                        }))}
                      />
                      <span className="font-medium">{service.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada Service aktif. Buat dulu di menu Service.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pkg-custom"
                checked={form.allowCustom}
                onChange={(e) => setForm((p) => ({ ...p, allowCustom: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="pkg-custom">{t("Izinkan jam custom", "Allow custom hours")}</Label>
            </div>
            {form.allowCustom && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pkg-min">{t("Jam Min", "Min Hours")}</Label>
                  <Input
                    id="pkg-min"
                    type="number"
                    min="0"
                    value={form.minHours}
                    onChange={(e) => setForm((p) => ({ ...p, minHours: e.target.value }))}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-max">{t("Jam Maks", "Max Hours")}</Label>
                  <Input
                    id="pkg-max"
                    type="number"
                    min="0"
                    value={form.maxHours}
                    onChange={(e) => setForm((p) => ({ ...p, maxHours: e.target.value }))}
                    placeholder="200"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? t("Simpan Perubahan", "Save Changes") : t("Buat Paket", "Create Package")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("Hapus Paket", "Delete Package")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              `Yakin mau hapus paket "${deleteTarget?.name}"? Proyek yang sudah pakai paket ini tidak terpengaruh.`,
              `Delete package "${deleteTarget?.name}"? Projects already using it won't be affected.`
            )}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={loading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Hapus", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
