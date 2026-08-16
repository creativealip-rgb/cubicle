"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProjectServices, getWorkspaceServices, setProjectServices } from "@/lib/actions/services";
import { useT } from "@/lib/i18n-client";
import { formatMoney } from "@/lib/utils";

type CatalogRow = {
  id: string;
  name: string;
  status: string;
  defaultPricingModel: string;
  defaultUnit: string;
  defaultPrice: string | number | null;
  currency: string;
};

type ProjectServiceRow = {
  serviceId: string | null;
  status: string;
  quantity: string | number;
  unit: string;
  unitPrice: string | number | null;
  includedAllowance: string | number | null;
  sortOrder: number;
};

export function ProjectServiceSettings({ projectId }: { projectId: string }) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [quantity, setQuantity] = useState<Record<string, string>>({});
  const [unitPriceOverride, setUnitPriceOverride] = useState<Record<string, string>>({});
  const [includedAllowance, setIncludedAllowance] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [catalogRows, projectRows] = await Promise.all([
          getWorkspaceServices({ includeArchived: true }),
          getProjectServices(projectId, { includeArchived: true }),
        ]);
        if (cancelled) return;
        setCatalog(catalogRows);
        const nextEnabled: Record<string, boolean> = {};
        const nextQty: Record<string, string> = {};
        const nextPrice: Record<string, string> = {};
        const nextAllowance: Record<string, string> = {};
        for (const row of catalogRows) {
          nextEnabled[row.id] = false;
          nextQty[row.id] = "1";
          nextPrice[row.id] = "";
          nextAllowance[row.id] = "";
        }
        for (const row of projectRows as ProjectServiceRow[]) {
          if (!row.serviceId) continue;
          nextEnabled[row.serviceId] = row.status === "active";
          nextQty[row.serviceId] = String(row.quantity ?? "1");
          nextPrice[row.serviceId] = row.unitPrice == null ? "" : String(row.unitPrice);
          nextAllowance[row.serviceId] = row.includedAllowance == null ? "" : String(row.includedAllowance);
        }
        setEnabled(nextEnabled);
        setQuantity(nextQty);
        setUnitPriceOverride(nextPrice);
        setIncludedAllowance(nextAllowance);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("Gagal memuat layanan project", "Failed to load project services"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [projectId, t]);

  const visibleCatalog = useMemo(
    () => catalog.filter((row) => row.status === "active" || enabled[row.id]),
    [catalog, enabled],
  );

  async function handleSave() {
    setSaving(true);
    try {
      await setProjectServices(
        projectId,
        catalog.map((row, sortOrder) => ({
          serviceId: row.id,
          enabled: Boolean(enabled[row.id]),
          quantity: quantity[row.id] ? Number(quantity[row.id]) : 1,
          unit: row.defaultUnit || "service",
          unitPriceOverride: unitPriceOverride[row.id] ? Number(unitPriceOverride[row.id]) : null,
          includedAllowance: includedAllowance[row.id] ? Number(includedAllowance[row.id]) : null,
          sortOrder,
        })),
      );
      toast.success(t("Layanan project disimpan", "Project services saved"));
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan layanan project", "Failed to save project services"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("Memuat…", "Loading…")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("Layanan Project", "Project Services")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("Pilih layanan dari katalog dan simpan snapshot harga per project.", "Select catalog services and store per-project price snapshots.")}
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Simpan", "Save")}
        </Button>
      </div>

      <div className="space-y-2">
        {visibleCatalog.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{t("Belum ada layanan workspace. Buat dulu di menu Layanan.", "No workspace services yet. Create services first.")}</CardContent></Card>
        ) : (
          visibleCatalog.map((row) => (
            <Card key={row.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_auto] md:items-end">
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.status === "active" ? t("Aktif di katalog", "Active in catalog") : t("Arsip di katalog", "Archived in catalog")}
                    {" · "}{row.defaultPricingModel}{" · "}{formatMoney(row.defaultPrice ?? 0, row.currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">{t("Qty", "Qty")}</Label>
                  <Input type="number" min="0" step="0.01" className="h-8 text-xs" value={quantity[row.id] || "1"} onChange={(e) => setQuantity((prev) => ({ ...prev, [row.id]: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">{t("Harga override", "Price override")}</Label>
                  <Input type="number" min="0" step="0.01" className="h-8 text-xs" value={unitPriceOverride[row.id] || ""} onChange={(e) => setUnitPriceOverride((prev) => ({ ...prev, [row.id]: e.target.value }))} placeholder={row.defaultPrice == null ? "" : String(row.defaultPrice)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">{t("Allowance", "Allowance")}</Label>
                  <Input type="number" min="0" step="0.01" className="h-8 text-xs" value={includedAllowance[row.id] || ""} onChange={(e) => setIncludedAllowance((prev) => ({ ...prev, [row.id]: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={Boolean(enabled[row.id])} onChange={(e) => setEnabled((prev) => ({ ...prev, [row.id]: e.target.checked }))} disabled={row.status !== "active" && !enabled[row.id]} />
                  {t("Aktif", "Enabled")}
                </label>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
