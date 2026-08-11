"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import {
  getExtraWorkspaceAmount,
  getStorageAddonAmount,
  type BillingPeriod,
  type StorageAddonKey,
} from "@/lib/billing-plans";

const PERIOD_STORAGE_KEY = "cubiqlo:billing:period";

// Catalog mirrors STORAGE_ADDONS (5/10/15 GB). Prices come from
// getStorageAddonAmount so the UI can never drift from checkout quoting.
const STORAGE_OPTIONS: StorageAddonKey[] = [5, 10, 15];

type PendingKey = `storage:${StorageAddonKey}` | "workspace" | null;

function loadStoredPeriod(): BillingPeriod {
  if (typeof window === "undefined") return "yearly";
  try {
    const stored = window.localStorage.getItem(PERIOD_STORAGE_KEY);
    return stored === "monthly" || stored === "yearly" ? stored : "yearly";
  } catch {
    return "yearly";
  }
}

/** Compact app-style price, e.g. Rp 10rb / Rp 120rb (same convention as plan cards). */
function formatRp(amount: number): string {
  return `Rp ${(amount / 1000).toLocaleString("id-ID")}rb`;
}

/**
 * Purchase controls for storage add-ons (+5/+10/+15 GB) and extra workspace
 * slots. Both POST to the same-origin billing checkout routes from the
 * browser (no provider calls here), disable every purchase button while a
 * checkout is in flight, surface 403/409/503 safely, and redirect to the
 * Pakasir payment URL returned by the server.
 *
 * Extra workspace is Team-only: the server enforces it (409), and the button
 * is shown disabled with an explanation unless the user's EFFECTIVE plan
 * (after expiry/grace) is team.
 */
export function AddonPurchaseControls({ effectivePlan }: { effectivePlan: string }) {
  const { t } = useT();
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [pending, setPending] = useState<PendingKey>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted period after hydration (defaults to yearly), same key
  // as the plan CheckoutButton so the whole billing page stays in sync.
  useEffect(() => {
    setPeriod(loadStoredPeriod());
  }, []);

  function selectPeriod(next: BillingPeriod) {
    setPeriod(next);
    try {
      window.localStorage.setItem(PERIOD_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — period still applies for this purchase.
    }
  }

  async function startCheckout(path: string, body: Record<string, unknown>, pendingKey: PendingKey) {
    setPending(pendingKey);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Business guards (409: free plan / non-Team), owner-only (403) and
        // provider-unconfigured (503) all return { error } — surface the
        // server message. 503 gets an extra retry hint.
        const serverMsg = typeof json.error === "string" ? json.error : null;
        if (res.status === 503) {
          setError(
            `${serverMsg ?? t("Pembayaran belum tersedia", "Payments are not available yet")}. ${t("Coba lagi nanti.", "Try again later.")}`,
          );
        } else {
          setError(serverMsg ?? t("Gagal membuat checkout", "Could not start checkout"));
        }
        return;
      }
      // Same-origin POST succeeded — go to the provider payment page.
      window.location.assign(json.data.paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Gagal membuat checkout", "Could not start checkout"));
    } finally {
      setPending(null);
    }
  }

  const isTeam = effectivePlan === "team";
  const busy = pending !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{t("Beli add-on", "Buy add-ons")}</p>
        <div
          role="tablist"
          aria-label="Billing period"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-600"
        >
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={period === option}
              onClick={() => selectPeriod(option)}
              className={cn(
                "inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-all",
                period === option ? "bg-white text-slate-950 shadow" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {option === "monthly" ? t("Bulanan", "Monthly") : t("Tahunan · hemat 2x", "Yearly · save 2x")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {STORAGE_OPTIONS.map((gb) => (
          <div key={gb} className="flex flex-col justify-between gap-2 rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium text-slate-950">+{gb} GB</p>
              <p className="text-xs text-slate-600">
                {formatRp(getStorageAddonAmount(gb, "monthly"))}/bln ·{" "}
                <span className={period === "yearly" ? "font-medium text-slate-950" : ""}>
                  {formatRp(getStorageAddonAmount(gb, "yearly"))}/thn
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              aria-busy={pending === `storage:${gb}` || undefined}
              onClick={() =>
                startCheckout("/api/billing/checkout", { addon: gb, period }, `storage:${gb}`)
              }
            >
              {pending === `storage:${gb}` ? t("Memproses...", "Processing...") : t("Beli", "Buy")}
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-3 text-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <p className="font-medium text-slate-950">+1 {t("workspace", "workspace")}</p>
            <p className="text-xs text-slate-600">
              {formatRp(getExtraWorkspaceAmount("monthly"))}/bln ·{" "}
              <span className={period === "yearly" ? "font-medium text-slate-950" : ""}>
                {formatRp(getExtraWorkspaceAmount("yearly"))}/thn
              </span>
            </p>
            {!isTeam && (
              <p className="mt-1 text-xs text-amber-700">
                {t(
                  "Hanya tersedia untuk plan Team. Upgrade ke Team untuk membeli workspace tambahan.",
                  "Only available on the Team plan. Upgrade to Team to buy extra workspaces.",
                )}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !isTeam}
            aria-busy={pending === "workspace" || undefined}
            onClick={() => startCheckout("/api/billing/checkout-extra-workspace", { period }, "workspace")}
          >
            {pending === "workspace" ? t("Memproses...", "Processing...") : t("Beli", "Buy")}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
