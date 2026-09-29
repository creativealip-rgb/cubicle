"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { cancelExtraWorkspaceAddOn, cancelStorageAddOn } from "@/lib/actions/billing-addons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { HardDrive, Sparkles, Building2, PackageOpen } from "lucide-react";

type Addon = {
  id: string;
  storageBytes: number;
  amount: string;
  billingPeriod: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
};

type ExtraWorkspaceEntitlement = {
  id: string;
  quantity: number;
  amount: string;
  billingPeriod: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
};

function formatAmount(amount: string): string {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return amount;
  return `Rp ${numeric.toLocaleString("id-ID")}`;
}

export function AddonManagement({
  storageAddons,
  extraWorkspaceEntitlements,
  aiAddons = [],
}: {
  storageAddons: Addon[];
  extraWorkspaceEntitlements: ExtraWorkspaceEntitlement[];
  aiAddons?: Array<{
    id: string;
    requestsQuota: number;
    amount: string;
    billingPeriod: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
  }>;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [busy, setBusy] = useState<string | null>(null);

  async function cancelStorage(id: string) {
    setBusy(id);
    const result = await cancelStorageAddOn(id);
    setBusy(null);
    if (!result.ok) return toast.error(result.error ?? t("Gagal membatalkan add-on", "Could not cancel add-on"));
    toast.success(t("Add-on dibatalkan di akhir periode", "Add-on will cancel at period end"));
    refresh();
  }

  async function cancelWorkspace(id: string) {
    setBusy(id);
    const result = await cancelExtraWorkspaceAddOn(id);
    setBusy(null);
    if (!result.ok) return toast.error(result.error ?? t("Gagal membatalkan workspace", "Could not cancel workspace add-on"));
    toast.success(t("Workspace tambahan dibatalkan di akhir periode", "Extra workspace will cancel at period end"));
    refresh();
  }

  const hasActiveAddons = storageAddons.length > 0 || aiAddons.length > 0 || extraWorkspaceEntitlements.length > 0;
  const workspaceSlots = extraWorkspaceEntitlements.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("Add-on Aktif", "Active Add-ons")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("Daftar add-on tambahan yang sedang aktif pada akunmu.", "List of active add-on subscriptions in your account.")}
          </p>
        </div>
      </div>

      {!hasActiveAddons ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground mb-2">
            <PackageOpen className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            {t("Belum ada add-on aktif", "No active add-ons yet")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t(
              "Pilih salah satu paket di atas jika membutuhkan kapasitas ekstra.",
              "Choose from the packages above whenever you need extra capacity."
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Storage Addons */}
          {storageAddons.map((addon) => (
            <div
              key={addon.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    +{Math.round(addon.storageBytes / 1024 ** 3)} GB Cloud Storage
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("Berakhir", "Ends")}: {new Date(addon.endsAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    {addon.status === "cancel_scheduled" && (
                      <span className="ml-1.5 text-amber-600 font-medium">
                        ({t("aktif sampai akhir periode", "active until period end")})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === addon.id || addon.status !== "active"}
                onClick={() => cancelStorage(addon.id)}
                className="h-7 text-xs font-medium rounded-lg"
              >
                {busy === addon.id ? "…" : t("Batalkan", "Cancel")}
              </Button>
            </div>
          ))}

          {/* AI Addons */}
          {aiAddons.map((addon) => (
            <div
              key={addon.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    +{addon.requestsQuota.toLocaleString("id-ID")} AI Requests
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatAmount(addon.amount)} · {t("Berakhir", "Ends")}:{" "}
                    {new Date(addon.endsAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    {addon.status === "cancel_scheduled" && (
                      <span className="ml-1.5 text-amber-600 font-medium">
                        ({t("aktif sampai akhir periode", "active until period end")})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Extra Workspace Addons */}
          {extraWorkspaceEntitlements.map((entitlement) => (
            <div
              key={entitlement.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    +{entitlement.quantity} Extra Workspace
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatAmount(entitlement.amount)} · {t("Berakhir", "Ends")}:{" "}
                    {new Date(entitlement.endsAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    {entitlement.status === "cancel_scheduled" && (
                      <span className="ml-1.5 text-amber-600 font-medium">
                        ({t("aktif sampai akhir periode", "active until period end")})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === entitlement.id || entitlement.status !== "active"}
                onClick={() => cancelWorkspace(entitlement.id)}
                className="h-7 text-xs font-medium rounded-lg"
              >
                {busy === entitlement.id ? "…" : t("Batalkan", "Cancel")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Addon, ExtraWorkspaceEntitlement };
