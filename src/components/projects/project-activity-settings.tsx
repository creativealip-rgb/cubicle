"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getProjectActivities,
  getWorkspaceActivities,
  setProjectActivities,
} from "@/lib/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type CatalogRow = {
  id: string;
  name: string;
  status: string;
  defaultBillable: boolean;
  defaultHourlyRate: string | number | null;
};

type MappingRow = {
  activityId: string;
  enabled: boolean;
  rateOverride: string | number | null;
  billableOverride: boolean | null;
};

interface ProjectActivitySettingsProps {
  projectId: string;
}

export function ProjectActivitySettings({
  projectId,
}: ProjectActivitySettingsProps) {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [rateOverride, setRateOverride] = useState<Record<string, string>>({});
  const [billableOverride, setBillableOverride] = useState<
    Record<string, "inherit" | "true" | "false">
  >({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [catalogRows, mappingRows] = await Promise.all([
          getWorkspaceActivities({ includeArchived: true }),
          getProjectActivities(projectId, { includeDisabled: true }),
        ]);
        if (cancelled) return;
        setCatalog(
          catalogRows.map((row) => ({
            id: row.id,
            name: row.name,
            status: row.status,
            defaultBillable: row.defaultBillable,
            defaultHourlyRate: row.defaultHourlyRate,
          })),
        );
        const nextEnabled: Record<string, boolean> = {};
        const nextRate: Record<string, string> = {};
        const nextBillable: Record<string, "inherit" | "true" | "false"> = {};
        for (const row of catalogRows) {
          nextEnabled[row.id] = false;
          nextRate[row.id] = "";
          nextBillable[row.id] = "inherit";
        }
        for (const row of mappingRows as MappingRow[]) {
          nextEnabled[row.activityId] = Boolean(row.enabled);
          nextRate[row.activityId] =
            row.rateOverride == null ? "" : String(row.rateOverride);
          nextBillable[row.activityId] =
            row.billableOverride == null
              ? "inherit"
              : row.billableOverride
                ? "true"
                : "false";
        }
        setEnabled(nextEnabled);
        setRateOverride(nextRate);
        setBillableOverride(nextBillable);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : t("Gagal memuat activity project", "Failed to load project activities"),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, t]);

  const activeCatalog = useMemo(
    () => catalog.filter((row) => row.status === "active" || enabled[row.id]),
    [catalog, enabled],
  );

  async function handleSave() {
    setSaving(true);
    try {
      const payload = catalog
        .filter((row) => enabled[row.id] || rateOverride[row.id] || billableOverride[row.id] !== "inherit")
        .map((row) => ({
          activityId: row.id,
          enabled: Boolean(enabled[row.id]),
          rateOverride: rateOverride[row.id]
            ? Number(rateOverride[row.id])
            : null,
          billableOverride:
            billableOverride[row.id] === "inherit"
              ? null
              : billableOverride[row.id] === "true",
        }));
      await setProjectActivities(projectId, payload);
      toast.success(t("Activity project disimpan", "Project activities saved"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal simpan activity project", "Failed to save project activities"),
      );
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
          <h3 className="text-sm font-semibold">
            {t("Activity Project", "Project Activities")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t(
              "Aktifkan activity + override billable/rate per project",
              "Enable activities plus billable/rate overrides per project",
            )}
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Simpan", "Save")}
        </Button>
      </div>

      <div className="space-y-2">
        {activeCatalog.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t(
                "Belum ada activity workspace. Buat dulu di menu Activity.",
                "No workspace activities yet. Create some in Activities first.",
              )}
            </CardContent>
          </Card>
        ) : (
          activeCatalog.map((row) => (
            <Card key={row.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.status === "active"
                      ? t("Aktif di katalog", "Active in catalog")
                      : t("Arsip di katalog", "Archived in catalog")}
                    {" · "}
                    {row.defaultBillable
                      ? t("Default billable", "Default billable")
                      : t("Default non-billable", "Default non-billable")}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">
                    {t("Rate override", "Rate override")}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    className="h-8 text-xs"
                    value={rateOverride[row.id] || ""}
                    onChange={(e) =>
                      setRateOverride((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    disabled={row.status !== "active" && !enabled[row.id]}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">
                    {t("Billable override", "Billable override")}
                  </Label>
                  <select
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    value={billableOverride[row.id] || "inherit"}
                    onChange={(e) =>
                      setBillableOverride((prev) => ({
                        ...prev,
                        [row.id]: e.target.value as "inherit" | "true" | "false",
                      }))
                    }
                  >
                    <option value="inherit">{t("Ikuti default", "Inherit")}</option>
                    <option value="true">{t("Billable", "Billable")}</option>
                    <option value="false">{t("Non-billable", "Non-billable")}</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(enabled[row.id])}
                    onChange={(e) =>
                      setEnabled((prev) => ({
                        ...prev,
                        [row.id]: e.target.checked,
                      }))
                    }
                    disabled={row.status !== "active" && !enabled[row.id]}
                  />
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
