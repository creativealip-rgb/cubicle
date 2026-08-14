"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BriefcaseBusiness, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmptyState } from "@/components/empty-state";
import {
  archiveService,
  createService,
  createServiceCategory,
  updateService,
} from "@/lib/actions/services";
import { useT } from "@/lib/i18n-client";
import { formatMoney } from "@/lib/utils";

export type ServicePricingModel = "fixed" | "hourly" | "unit";

export type CatalogService = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  defaultPricingModel: ServicePricingModel;
  defaultUnit: string;
  defaultPrice: string | number | null;
  currency: string;
  status: "active" | "archived";
};

export type ServiceCategory = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
};

const CURRENCIES = ["IDR", "USD", "EUR", "GBP", "SGD"];
const pricingModelLabels: Record<ServicePricingModel, { id: string; en: string }> = {
  fixed: { id: "Fixed Price", en: "Fixed Price" },
  hourly: { id: "Per jam", en: "Hourly" },
  unit: { id: "Retainer", en: "Retainer" },
};

type FormState = {
  name: string;
  description: string;
  categoryId: string;
  defaultPricingModel: ServicePricingModel;
  defaultUnit: string;
  defaultPrice: string;
  currency: string;
};

function emptyForm(defaultCurrency: string): FormState {
  return {
    name: "",
    description: "",
    categoryId: "",
    defaultPricingModel: "fixed",
    defaultUnit: "service",
    defaultPrice: "",
    currency: defaultCurrency || "IDR",
  };
}

export function ServiceCatalog({
  services,
  categories,
  defaultCurrency = "IDR",
}: {
  services: CatalogService[];
  categories: ServiceCategory[];
  defaultCurrency?: string;
}) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogService | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCurrency));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(defaultCurrency));
    setOpen(true);
  }

  function openEdit(service: CatalogService) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      categoryId: service.categoryId ?? "",
      defaultPricingModel: service.defaultPricingModel,
      defaultUnit: service.defaultUnit,
      defaultPrice: service.defaultPrice == null ? "" : String(service.defaultPrice),
      currency: service.currency || defaultCurrency || "IDR",
    });
    setOpen(true);
  }

  async function handleCreateCategory() {
    const name = categoryName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await createServiceCategory({ name, color: "#64748b", sortOrder: categories.length });
      toast.success(t("Kategori dibuat", "Category created"));
      setCategoryName("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal buat kategori", "Failed to create category"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("Nama layanan wajib diisi", "Service name is required"));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        categoryId: form.categoryId || null,
        defaultPricingModel: form.defaultPricingModel,
        defaultUnit: form.defaultUnit.trim() || "service",
        defaultPrice: form.defaultPrice ? Number(form.defaultPrice) : null,
        currency: form.currency,
        status: "active" as const,
      };
      if (editing) {
        await updateService(editing.id, payload);
        toast.success(t("Layanan diperbarui", "Service updated"));
      } else {
        await createService(payload);
        toast.success(t("Layanan dibuat", "Service created"));
      }
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Terjadi kesalahan", "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await archiveService(deleteTarget.id);
      toast.success(t("Layanan diarsipkan", "Service archived"));
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal arsip", "Archive failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="app-page-header">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Layanan", "Services")}</h1>
          <p className="app-page-description">
            {t(
              "Katalog layanan dasar untuk dipakai di proyek, paket, invoice, dan time tracking.",
              "Base service catalog for projects, packages, invoices, and time tracking.",
            )}
          </p>
        </div>
        <div className="app-page-actions">
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("Layanan Baru", "New Service")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="service-category-name">{t("Kategori cepat", "Quick category")}</Label>
            <Input
              id="service-category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder={t("mis. Website, Ads, Support", "e.g. Website, Ads, Support")}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleCreateCategory} disabled={loading || !categoryName.trim()}>
            {t("Tambah kategori", "Add category")}
          </Button>
        </CardContent>
      </Card>

      {services.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title={t("Belum ada layanan", "No services yet")}
          description={t(
            "Buat layanan seperti Website build, SEO retainer, atau Maintenance untuk dipilih di proyek.",
            "Create services like Website build, SEO retainer, or Maintenance for project selection.",
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{service.name}</p>
                      <Badge variant={service.status === "active" ? "secondary" : "outline"} className="text-[10px]">
                        {service.status === "active" ? t("Aktif", "Active") : t("Diarsipkan", "Archived")}
                      </Badge>
                    </div>
                    {service.description ? (
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(service)} aria-label={t("Ubah", "Edit")}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(service)} aria-label={t("Arsip", "Archive")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {t(pricingModelLabels[service.defaultPricingModel].id, pricingModelLabels[service.defaultPricingModel].en)}
                  </Badge>
                  <span>{service.defaultUnit}</span>
                  {service.defaultPrice != null ? (
                    <span>{formatMoney(service.defaultPrice, service.currency)}</span>
                  ) : null}
                  {service.categoryName ? <span>· {service.categoryName}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-[520px] sm:p-6">
          <DialogHeader>
            <DialogTitle>{editing ? t("Ubah Layanan", "Edit Service") : t("Layanan Baru", "New Service")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="service-name">{t("Nama layanan", "Service name")} *</Label>
              <Input id="service-name" required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Website build" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-description">{t("Deskripsi", "Description")}</Label>
              <Textarea id="service-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Kategori", "Category")}</Label>
                <Select value={form.categoryId || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value === "__none__" ? "" : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("Tanpa kategori", "No category")}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("Model harga", "Pricing model")}</Label>
                <Select value={form.defaultPricingModel} onValueChange={(value) => setForm((prev) => ({ ...prev, defaultPricingModel: value as ServicePricingModel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{t("Fixed Price", "Fixed Price")}</SelectItem>
                    <SelectItem value="hourly">{t("Per jam", "Hourly")}</SelectItem>
                    <SelectItem value="unit">{t("Retainer", "Retainer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="service-unit">{t("Unit", "Unit")}</Label>
                <Input id="service-unit" value={form.defaultUnit} onChange={(event) => setForm((prev) => ({ ...prev, defaultUnit: event.target.value }))} placeholder="service" />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="service-price">{t("Harga", "Price")}</Label>
                <Input id="service-price" type="number" step="0.01" min="0" value={form.defaultPrice} onChange={(event) => setForm((prev) => ({ ...prev, defaultPrice: event.target.value }))} placeholder="2500000" />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>{t("Mata uang", "Currency")}</Label>
                <Select value={form.currency} onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? t("Simpan Perubahan", "Save Changes") : t("Buat Layanan", "Create Service")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(openNow) => !openNow && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{t("Arsip layanan", "Archive service")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              `Arsipkan layanan "${deleteTarget?.name}"? Snapshot project lama tetap aman.`,
              `Archive service "${deleteTarget?.name}"? Existing project snapshots stay safe.`,
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={loading}>{t("Batal", "Cancel")}</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={loading}>{t("Arsip", "Archive")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
