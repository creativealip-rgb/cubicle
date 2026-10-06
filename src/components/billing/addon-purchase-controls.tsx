"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HardDrive, Sparkles, Building2, ShieldCheck, Users } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import {
  getStorageAddonPeriodLabel,
  getExtraWorkspacePeriodLabel,
  getExtraMemberAddonPeriodLabel,
  getAiRequestsAddonPeriodLabel,
  type BillingPeriod,
} from "@/lib/billing-pricing";
import {
  type StorageAddonKey,
  type AiRequestsAddonKey,
  type ExtraMemberAddonKey,
  EXTRA_MEMBER_ADDONS,
} from "@/lib/billing-plans";

const STORAGE_OPTIONS: StorageAddonKey[] = [5, 10, 15];
const AI_OPTIONS: AiRequestsAddonKey[] = [500, 1000];
const MEMBER_OPTIONS: ExtraMemberAddonKey[] = [1, 3, 5];

type PendingKey =
  | `storage:${StorageAddonKey}`
  | `ai:${AiRequestsAddonKey}`
  | `member:${ExtraMemberAddonKey}`
  | "workspace"
  | null;

export function AddonPurchaseControls({ effectivePlan }: { effectivePlan: string }) {
  const { t, lang } = useT();
  const period: BillingPeriod = "yearly";
  const [pending, setPending] = useState<PendingKey>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<StorageAddonKey>(5);
  const [selectedAi, setSelectedAi] = useState<AiRequestsAddonKey>(1000);
  const [selectedMember, setSelectedMember] = useState<ExtraMemberAddonKey>(3);

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
      if (!json?.data?.paymentUrl) {
        setError(t("URL pembayaran tidak ditemukan dari server.", "Payment URL not returned from server."));
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
              "Tingkatkan kapasitas penyimpanan, kuota AI bulanan, anggota tim, atau workspace sesuai kebutuhan tokomu.",
              "Expand storage, monthly AI quota, team members, or workspace capacity as your team scales."
            )}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {/* 1. Extra Members Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/[0.04] to-transparent p-4 shadow-xs relative overflow-hidden">
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                Team Plan Only
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-sm font-bold text-foreground">{t("Extra Anggota Tim", "Extra Team Members")}</h4>
              <p className="text-[11px] text-muted-foreground min-h-[32px] mt-0.5">
                {t("Tambah kuota slot undangan anggota ke workspace Anda.", "Expand member invitation slots in your workspace.")}
              </p>
            </div>

            {/* Member Tier Selector */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1 mt-3">
              {MEMBER_OPTIONS.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setSelectedMember(qty)}
                  className={`rounded-lg py-1 text-xs font-semibold transition-all ${
                    selectedMember === qty
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  +{qty} {t("Orang", "Seats")}
                </button>
              ))}
            </div>

            <div className="min-h-[28px] mt-2.5 flex items-center">
              {!isTeam ? (
                <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                  {t("Perlu upgrade ke plan Team.", "Requires active Team plan.")}
                </div>
              ) : (
                <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3 inline mr-1" />
                  {t("Siap diaktifkan ke akun", "Ready to activate")}
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-border/40">
              <div className="text-lg font-mono font-bold text-foreground">
                {getExtraMemberAddonPeriodLabel(selectedMember, lang)}
                <span className="text-xs font-normal text-muted-foreground">/{t("tahun", "yr")}</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            disabled={busy || !isTeam}
            aria-busy={pending === `member:${selectedMember}` || undefined}
            onClick={() =>
              startCheckout("/api/billing/checkout-extra-member", { quantity: selectedMember }, `member:${selectedMember}`)
            }
            className="mt-3 w-full h-8.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            {pending === `member:${selectedMember}`
              ? t("Memproses...", "Processing...")
              : !isTeam
              ? t("Upgrade ke Team", "Upgrade to Team")
              : t(`Beli +${selectedMember} Anggota`, `Buy +${selectedMember} Seats`)}
          </Button>
        </div>

        {/* 2. Extra Storage Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/[0.04] to-transparent p-4 shadow-xs">
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <HardDrive className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                Cloud Storage
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-sm font-bold text-foreground">{t("Extra Storage", "Extra Storage")}</h4>
              <p className="text-[11px] text-muted-foreground min-h-[32px] mt-0.5">
                {t("Tambah kuota berkas proyek & lampiran.", "Expand project files & attachments quota.")}
              </p>
            </div>

            {/* Storage Tier Selector */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1 mt-3">
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

            <div className="min-h-[28px] mt-2.5 flex items-center">
              <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3 inline mr-1" />
                {t("Tersedia untuk semua plan", "Available on all plans")}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-border/40">
              <div className="text-lg font-mono font-bold text-foreground">
                {getStorageAddonPeriodLabel(selectedStorage, period, lang)}
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
            className="mt-3 w-full h-8.5 rounded-xl text-xs font-semibold"
          >
            {pending === `storage:${selectedStorage}`
              ? t("Memproses...", "Processing...")
              : t(`Beli +${selectedStorage} GB`, `Buy +${selectedStorage} GB`)}
          </Button>
        </div>

        {/* 3. AI Requests Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/[0.04] to-transparent p-4 shadow-xs relative overflow-hidden">
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {selectedAi === 1000 ? "Best Value" : "Starter AI"}
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-sm font-bold text-foreground">
                {t("AI Request Tambahan", "Extra AI Requests")}
              </h4>
              <p className="text-[11px] text-muted-foreground min-h-[32px] mt-0.5">
                {t("Tingkatkan batas AI bulanan untuk dokumen & prompt.", "Boost monthly AI quota for docs & prompt generation.")}
              </p>
            </div>

            {/* AI Tier Selector */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1 mt-3">
              {AI_OPTIONS.map((quota) => (
                <button
                  key={quota}
                  type="button"
                  onClick={() => setSelectedAi(quota)}
                  className={`rounded-lg py-1 text-xs font-semibold transition-all ${
                    selectedAi === quota
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  +{quota >= 1000 ? `${quota / 1000}k` : quota} {t("req/bln", "req/mo")}
                </button>
              ))}
            </div>

            <div className="min-h-[28px] mt-2.5 flex items-center">
              <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3 inline mr-1" />
                {t("Tersedia untuk semua plan", "Available on all plans")}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-border/40">
              <div className="text-lg font-mono font-bold text-foreground">
                {getAiRequestsAddonPeriodLabel(selectedAi, lang)}
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
            className="mt-3 w-full h-8.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            {pending === `ai:${selectedAi}`
              ? t("Memproses...", "Processing...")
              : t(`Beli +${selectedAi.toLocaleString("id-ID")} AI/bln`, `Buy +${selectedAi.toLocaleString("id-ID")} AI/mo`)}
          </Button>
        </div>

        {/* 4. Extra Workspace Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-4 shadow-xs">
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                Team Plan Only
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-sm font-bold text-foreground">+1 Extra Workspace</h4>
              <p className="text-[11px] text-muted-foreground min-h-[32px] mt-0.5">
                {t("Tambah slot workspace terpisah untuk entitas bisnis baru.", "Separate workspace slot for new business entities.")}
              </p>
            </div>

            {/* Extra Workspace Selector Placeholder (Fixed Height) */}
            <div className="rounded-xl bg-muted/30 border border-border/40 p-1 mt-3 flex items-center justify-center min-h-[32px]">
              <span className="text-xs font-medium text-muted-foreground">+1 Workspace Slot</span>
            </div>

            <div className="min-h-[28px] mt-2.5 flex items-center">
              {!isTeam ? (
                <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                  {t("Perlu upgrade ke plan Team.", "Requires active Team plan.")}
                </div>
              ) : (
                <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3 inline mr-1" />
                  {t("Siap diaktifkan ke akun", "Ready to activate")}
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-border/40">
              <div className="text-lg font-mono font-bold text-foreground">
                {getExtraWorkspacePeriodLabel(period, lang)}
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
            className="mt-3 w-full h-8.5 rounded-xl text-xs font-semibold"
          >
            {pending === "workspace"
              ? t("Memproses...", "Processing...")
              : !isTeam
              ? t("Upgrade ke Team", "Upgrade to Team")
              : t("Beli +1 Workspace", "Buy +1 Workspace")}
          </Button>
        </div>
      </div>
    </div>
  );
}
