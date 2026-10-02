"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HardDrive, Sparkles, Building2, ShieldCheck, Zap } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import {
  getStorageAddonPeriodLabel,
  getExtraWorkspacePeriodLabel,
  getAiRequestsAddonPeriodLabel,
  type BillingPeriod,
} from "@/lib/billing-pricing";
import { type StorageAddonKey, type AiRequestsAddonKey } from "@/lib/billing-plans";

const STORAGE_OPTIONS: StorageAddonKey[] = [5, 10, 15];
const AI_OPTIONS: AiRequestsAddonKey[] = [500, 1000];

type PendingKey = `storage:${StorageAddonKey}` | `ai:${AiRequestsAddonKey}` | "workspace" | null;

export function AddonPurchaseControls({ effectivePlan }: { effectivePlan: string }) {
  const { t } = useT();
  const period: BillingPeriod = "yearly";
  const [pending, setPending] = useState<PendingKey>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<StorageAddonKey>(5);
  const [selectedAi, setSelectedAi] = useState<AiRequestsAddonKey>(1000);

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("Beli Add-on Tambahan", "Purchase Add-ons")}</h3>
          <p className="text-xs text-muted-foreground">
            {t(
              "Tingkatkan kapasitas penyimpanan, kuota AI bulanan, atau workspace sesuai kebutuhan tokomu.",
              "Expand storage, monthly AI quota, or workspace capacity as your team scales."
            )}
          </p>
        </div>
      </div>

      {/* 3-Column Premium Addon Catalog Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 1. Storage Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <HardDrive className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                Cloud Storage
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">{t("Extra Storage", "Extra Storage")}</h4>
              <p className="text-[11px] text-muted-foreground">
                {t("Tambah kuota berkas proyek & lampiran.", "Expand project files & attachments quota.")}
              </p>
            </div>

            {/* Storage Tier Selector */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1">
              {STORAGE_OPTIONS.map((gb) => (
                <button
                  key={gb}
                  type="button"
                  onClick={() => setSelectedStorage(gb)}
                  className={`rounded-lg py-1 text-xs font-semibold transition-all ${
                    selectedStorage === gb
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  +{gb} GB
                </button>
              ))}
            </div>

            <div className="pt-1">
              <div className="text-lg font-mono font-bold text-foreground">
                {getStorageAddonPeriodLabel(selectedStorage, period)}
                <span className="text-xs font-normal text-muted-foreground">/{t("tahun", "yr")}</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            disabled={busy}
            aria-busy={pending === `storage:${selectedStorage}` || undefined}
            onClick={() =>
              startCheckout("/api/billing/checkout", { addon: selectedStorage, period }, `storage:${selectedStorage}`)
            }
            className="mt-4 w-full h-8.5 rounded-xl text-xs font-semibold"
          >
            {pending === `storage:${selectedStorage}`
              ? t("Memproses...", "Processing...")
              : t(`Beli +${selectedStorage} GB`, `Buy +${selectedStorage} GB`)}
          </Button>
        </div>

        {/* 2. AI Requests Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/[0.04] to-transparent p-4 shadow-xs relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                {selectedAi === 1000 ? "Best Value" : "Starter AI"}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">
                +{selectedAi.toLocaleString("id-ID")} AI Requests / {t("bln", "mo")}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Tambahan kuota AI bulanan aktif setahun untuk Assistant & Prompt Studio.",
                  "Extra monthly AI quota valid for 1 full year for Assistant & Prompts."
                )}
              </p>
            </div>

            {/* AI Tier Selector: 500 vs 1.000 */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1">
              {AI_OPTIONS.map((quota) => (
                <button
                  key={quota}
                  type="button"
                  onClick={() => setSelectedAi(quota)}
                  className={`rounded-lg py-1 text-xs font-semibold transition-all ${
                    selectedAi === quota
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  +{quota.toLocaleString("id-ID")}/{t("bln", "mo")}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <div className="text-lg font-mono font-bold text-foreground">
                {getAiRequestsAddonPeriodLabel(selectedAi)}
                <span className="text-xs font-normal text-muted-foreground">/{t("tahun", "yr")}</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            disabled={busy}
            aria-busy={pending === `ai:${selectedAi}` || undefined}
            onClick={() =>
              startCheckout("/api/billing/checkout-ai-addon", { tier: selectedAi, period }, `ai:${selectedAi}`)
            }
            className="mt-4 w-full h-8.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
          >
            {pending === `ai:${selectedAi}`
              ? t("Memproses...", "Processing...")
              : t(`Beli +${selectedAi.toLocaleString("id-ID")} AI/bln`, `Buy +${selectedAi.toLocaleString("id-ID")} AI/mo`)}
          </Button>
        </div>

        {/* 3. Extra Workspace Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                Team Plan Only
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">+1 Extra Workspace</h4>
              <p className="text-[11px] text-muted-foreground">
                {t("Tambah slot workspace terpisah untuk entitas bisnis baru.", "Separate workspace slot for new business entities.")}
              </p>
            </div>

            {!isTeam ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400 text-[11px]">
                {t("Perlu upgrade ke plan Team.", "Requires active Team plan.")}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 text-[11px]">
                <ShieldCheck className="h-3 w-3 inline mr-1" />
                {t("Siap diaktifkan ke akun", "Ready to activate")}
              </div>
            )}

            <div className="pt-1">
              <div className="text-lg font-mono font-bold text-foreground">
                {getExtraWorkspacePeriodLabel(period)}
                <span className="text-xs font-normal text-muted-foreground">/{t("tahun", "yr")}</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={busy || !isTeam}
            aria-busy={pending === "workspace" || undefined}
            onClick={() => startCheckout("/api/billing/checkout-extra-workspace", { period }, "workspace")}
            className="mt-4 w-full h-8.5 rounded-xl text-xs font-semibold"
          >
            {pending === "workspace"
              ? t("Memproses...", "Processing...")
              : !isTeam
                ? t("Khusus Plan Team", "Team Plan Only")
                : t("Beli +1 Workspace", "Buy +1 Workspace")}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
