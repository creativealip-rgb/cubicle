"use client";

import { useState, useMemo } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  Clock,
  Tag,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

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
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogService | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "fixed" | "hourly" | "unit">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCurrency));

  // KPIs
  const activeCount = services.filter((s) => s.status === "active").length;
  const fixedCount = services.filter((s) => s.defaultPricingModel === "fixed").length;
  const hourlyCount = services.filter((s) => s.defaultPricingModel === "hourly" || s.defaultPricingModel === "unit").length;

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchModel = activeFilter === "all" || s.defaultPricingModel === activeFilter;
      const matchCat = selectedCategory === "all" || s.categoryId === selectedCategory;
      return matchModel && matchCat;
    });
  }, [services, activeFilter, selectedCategory]);

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

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await createServiceCategory({ name, color: "#64748b", sortOrder: categories.length });
      toast.success(t("Kategori berhasil dibuat", "Category created"));
      setCategoryName("");
      setCategoryModalOpen(false);
      refresh();
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
      refresh();
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
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal arsip", "Archive failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Universal PageHeader */}
      <PageHeader
        icon={Wrench}
        title={t("Katalog Layanan", "Service Catalog")}
        description={t(
          "Daftar spesifikasi layanan dasar untuk proyek, paket penawaran, proposal, invoice, dan time tracking.",
          "Base service specifications for projects, packages, proposals, invoices, and time tracking."
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl font-semibold text-xs gap-1.5 shadow-xs"
              onClick={() => setCategoryModalOpen(true)}
            >
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {t("Kategori", "Categories")}
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-xl font-semibold text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("Layanan Baru", "New Service")}
            </Button>
          </div>
        }
      />

      {/* 2. Executive 3-KPI Overview Strip */}
      <section className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wrench className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("Total Layanan", "Total Services")}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{activeCount} <span className="text-xs font-normal text-muted-foreground">{t("Aktif", "Active")}</span></p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold h-5 px-2 rounded-full border-primary/30 bg-primary/10 text-primary">
            100% Ready
          </Badge>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("Fixed Price", "Fixed Price")}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{fixedCount} <span className="text-xs font-normal text-muted-foreground">{t("Layanan", "Services")}</span></p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold h-5 px-2 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
            Per Proyek
          </Badge>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("Hourly & Retainer", "Hourly & Retainer")}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{hourlyCount} <span className="text-xs font-normal text-muted-foreground">{t("Layanan", "Services")}</span></p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold h-5 px-2 rounded-full border-blue-500/30 bg-blue-500/10 text-blue-700">
            Time & Retainer
          </Badge>
        </div>
      </section>

      {/* 3. Filter Toolbar */}
      <div className="rounded-2xl border border-border/80 bg-card p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={activeFilter === "all" ? "default" : "ghost"}
            className={cn("h-7 px-3 text-xs font-semibold rounded-lg", activeFilter === "all" && "bg-primary text-primary-foreground")}
            onClick={() => setActiveFilter("all")}
          >
            {t("Semua Model", "All Models")} ({services.length})
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "fixed" ? "default" : "ghost"}
            className={cn("h-7 px-3 text-xs font-semibold rounded-lg", activeFilter === "fixed" && "bg-primary text-primary-foreground")}
            onClick={() => setActiveFilter("fixed")}
          >
            {t("Fixed Price", "Fixed Price")}
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "hourly" ? "default" : "ghost"}
            className={cn("h-7 px-3 text-xs font-semibold rounded-lg", activeFilter === "hourly" && "bg-primary text-primary-foreground")}
            onClick={() => setActiveFilter("hourly")}
          >
            {t("Per Jam", "Hourly")}
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "unit" ? "default" : "ghost"}
            className={cn("h-7 px-3 text-xs font-semibold rounded-lg", activeFilter === "unit" && "bg-primary text-primary-foreground")}
            onClick={() => setActiveFilter("unit")}
          >
            {t("Retainer", "Retainer")}
          </Button>
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">{t("Kategori:", "Category:")}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-7 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-medium"
            >
              <option value="all">{t("Semua Kategori", "All Categories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. Modular Cards Grid */}
      {filteredServices.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title={t("Tidak ada layanan ditemukan", "No services found")}
          description={t(
            "Belum ada layanan yang cocok dengan filter. Tambahkan layanan baru atau ubah kriteria filter.",
            "No services match the active filter criteria."
          )}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const isFixed = service.defaultPricingModel === "fixed";
            const isHourly = service.defaultPricingModel === "hourly";

            return (
              <div
                key={service.id}
                className={cn(
                  "rounded-2xl border bg-card p-4 shadow-xs flex flex-col justify-between transition-all hover:border-primary/40 hover:shadow-sm",
                  service.status === "archived" ? "border-dashed opacity-60 bg-muted/20" : "border-border/80"
                )}
              >
                <div>
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isFixed ? "bg-emerald-500/10 text-emerald-600" : isHourly ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                      )}>
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate" title={service.name}>
                          {service.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={cn(
                            "text-[9px] px-1.5 py-0 h-4.5 rounded-full font-semibold border",
                            isFixed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : isHourly ? "border-blue-500/30 bg-blue-500/10 text-blue-700" : "border-purple-500/30 bg-purple-500/10 text-purple-700"
                          )}>
                            {t(pricingModelLabels[service.defaultPricingModel].id, pricingModelLabels[service.defaultPricingModel].en)}
                          </Badge>
                          {service.categoryName && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              · {service.categoryName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(service)}
                        aria-label={t("Ubah", "Edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(service)}
                        aria-label={t("Arsip", "Archive")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </div>

                {/* Price & Unit Tag */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("Tarif Acuan", "Standard Rate")}
                    </span>
                    <p className="text-sm font-extrabold text-foreground font-mono">
                      {service.defaultPrice != null
                        ? formatMoney(service.defaultPrice, service.currency)
                        : t("Belum di-set", "Not set")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-medium h-5 px-2 rounded-md">
                    /{service.defaultUnit || "service"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Manager Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {t("Kategori Layanan", "Service Categories")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t("Tambah Kategori Baru", "Add New Category")}</Label>
              <div className="flex gap-2">
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder={t("Contoh: Web Development, Design, SEO", "e.g. Web Development, Design, SEO")}
                  className="rounded-xl h-10 text-sm flex-1"
                />
                <Button type="submit" disabled={loading || !categoryName.trim()} className="rounded-xl font-semibold">
                  {t("Simpan", "Save")}
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold text-muted-foreground">{t("Daftar Kategori Tersedia", "Available Categories")}</Label>
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">{t("Belum ada kategori.", "No categories yet.")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {categories.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-xs py-1 px-2.5 rounded-lg border-border/80 bg-muted/30">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Service Edit / Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-[520px] sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {editing ? t("Ubah Layanan", "Edit Service") : t("Layanan Baru", "New Service")}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="service-name" className="text-xs font-semibold">{t("Nama Layanan", "Service Name")} *</Label>
              <Input
                id="service-name"
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Contoh: Pembuatan Website E-Commerce"
                className="rounded-xl h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-description" className="text-xs font-semibold">{t("Deskripsi", "Description")}</Label>
              <Textarea
                id="service-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                placeholder={t("Spesifikasi atau lingkup pekerjaan layanan...", "Scope of service...")}
                className="rounded-xl text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("Kategori", "Category")}</Label>
                <Select value={form.categoryId || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value === "__none__" ? "" : value }))}>
                  <SelectTrigger className="rounded-xl h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="__none__">{t("Tanpa kategori", "No category")}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("Model Harga", "Pricing Model")}</Label>
                <Select value={form.defaultPricingModel} onValueChange={(value) => setForm((prev) => ({ ...prev, defaultPricingModel: value as ServicePricingModel }))}>
                  <SelectTrigger className="rounded-xl h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="fixed">{t("Fixed Price", "Fixed Price")}</SelectItem>
                    <SelectItem value="hourly">{t("Per jam", "Hourly")}</SelectItem>
                    <SelectItem value="unit">{t("Retainer", "Retainer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="service-unit" className="text-xs font-semibold">{t("Unit", "Unit")}</Label>
                <Input id="service-unit" value={form.defaultUnit} onChange={(event) => setForm((prev) => ({ ...prev, defaultUnit: event.target.value }))} placeholder="proyek / jam" className="rounded-xl h-10 text-sm" />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="service-price" className="text-xs font-semibold">{t("Tarif Acuan", "Rate")}</Label>
                <Input id="service-price" type="number" step="0.01" min="0" value={form.defaultPrice} onChange={(event) => setForm((prev) => ({ ...prev, defaultPrice: event.target.value }))} placeholder="2500000" className="rounded-xl h-10 text-sm font-mono" />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold">{t("Mata Uang", "Currency")}</Label>
                <Select value={form.currency} onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}>
                  <SelectTrigger className="rounded-xl h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={loading} className="w-full rounded-xl font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? t("Simpan Perubahan", "Save Changes") : t("Buat Layanan", "Create Service")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Archive Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(openNow) => !openNow && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader><DialogTitle>{t("Arsip Layanan", "Archive Service")}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(
              `Arsipkan layanan "${deleteTarget?.name}"? Snapshot pada invoice dan proyek terdahulu tetap tersimpan aman.`,
              `Archive service "${deleteTarget?.name}"? Past snapshots on invoices and projects remain safe.`
            )}
          </p>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)} disabled={loading}>{t("Batal", "Cancel")}</Button>
            <Button variant="destructive" className="rounded-xl font-semibold" onClick={handleArchive} disabled={loading}>{t("Arsipkan", "Archive")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
