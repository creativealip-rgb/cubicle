"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelExtraWorkspaceAddOn, cancelStorageAddOn } from "@/lib/actions/billing-addons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

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
}: {
  storageAddons: Addon[];
  extraWorkspaceEntitlements: ExtraWorkspaceEntitlement[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function cancelStorage(id: string) {
    setBusy(id);
    const result = await cancelStorageAddOn(id);
    setBusy(null);
    if (!result.ok) return toast.error(result.error ?? t("Gagal membatalkan add-on", "Could not cancel add-on"));
    toast.success(t("Add-on dibatalkan di akhir periode", "Add-on will cancel at period end"));
    router.refresh();
  }
  async function cancelWorkspace(id: string) {
    setBusy(id);
    const result = await cancelExtraWorkspaceAddOn(id);
    setBusy(null);
    if (!result.ok) return toast.error(result.error ?? t("Gagal membatalkan workspace", "Could not cancel workspace add-on"));
    toast.success(t("Workspace tambahan dibatalkan di akhir periode", "Extra workspace will cancel at period end"));
    router.refresh();
  }
  const storageTotal = storageAddons.reduce((sum, addon) => sum + addon.storageBytes, 0);
  const workspaceSlots = extraWorkspaceEntitlements.reduce((sum, e) => sum + e.quantity, 0);
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t("Add-on aktif", "Active add-ons")}</p>
      {storageAddons.map((addon) => (
        <div key={addon.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <span>
            +{Math.round(addon.storageBytes / 1024 ** 3)} GB · {t("berakhir", "ends")} {addon.endsAt.toLocaleDateString()}
            {addon.status === "cancel_scheduled" && (
              <span className="ml-2 text-xs text-muted-foreground">
                {t("aktif hingga akhir periode", "active until period end")}
              </span>
            )}
          </span>
          <Button size="sm" variant="outline" disabled={busy === addon.id || addon.status !== "active"} onClick={() => cancelStorage(addon.id)}>{busy === addon.id ? "…" : t("Batalkan", "Cancel")}</Button>
        </div>
      ))}
      {extraWorkspaceEntitlements.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {t("Workspace tambahan aktif", "Active extra workspace slots")}: {workspaceSlots}
          </p>
          {extraWorkspaceEntitlements.map((entitlement) => (
            <div key={entitlement.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>
                +{entitlement.quantity} {t("workspace", "workspace")} · {formatAmount(entitlement.amount)} · {t("berakhir", "ends")} {entitlement.endsAt.toLocaleDateString()}
                {entitlement.status === "cancel_scheduled" && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t("aktif hingga akhir periode", "active until period end")}
                  </span>
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === entitlement.id || entitlement.status !== "active"}
                onClick={() => cancelWorkspace(entitlement.id)}
              >
                {busy === entitlement.id ? "…" : t("Batalkan", "Cancel")}
              </Button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export type { Addon, ExtraWorkspaceEntitlement };
