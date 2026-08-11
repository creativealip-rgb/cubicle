"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelExtraWorkspaceAddOn, cancelStorageAddOn } from "@/lib/actions/billing-addons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

type Addon = { id: string; storageBytes: number; amount: string; status: string; endsAt: Date };

export function AddonManagement({ storageAddons, extraWorkspaceSlots }: { storageAddons: Addon[]; extraWorkspaceSlots: number }) {
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
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t("Add-on aktif", "Active add-ons")}</p>
      {storageAddons.map((addon) => (
        <div key={addon.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <span>+{Math.round(addon.storageBytes / 1024 ** 3)} GB · {t("berakhir", "ends")} {addon.endsAt.toLocaleDateString()}</span>
          <Button size="sm" variant="outline" disabled={busy === addon.id || addon.status !== "active"} onClick={() => cancelStorage(addon.id)}>{busy === addon.id ? "…" : t("Batalkan", "Cancel")}</Button>
        </div>
      ))}
      <p className="text-sm text-muted-foreground">{t("Workspace tambahan aktif", "Active extra workspace slots")}: {extraWorkspaceSlots}</p>
    </div>
  );
}

export type { Addon };
