"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, XCircle, X } from "lucide-react";
import type { CheckoutStatus } from "@/lib/billing-checkout-status";

const STATUS_META: Record<
  CheckoutStatus,
  {
    icon: typeof CheckCircle2;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
    badgeClass: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    id: string;
    en: string;
  }
> = {
  completed: {
    icon: CheckCircle2,
    badgeVariant: "default",
    badgeClass: "bg-emerald-600 hover:bg-emerald-600 text-white",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-700 dark:text-emerald-400",
    id: "Pembayaran berhasil",
    en: "Payment completed",
  },
  pending: {
    icon: Clock,
    badgeVariant: "secondary",
    badgeClass: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    textClass: "text-amber-700 dark:text-amber-400",
    id: "Menunggu pembayaran",
    en: "Payment pending",
  },
  failed: {
    icon: XCircle,
    badgeVariant: "destructive",
    badgeClass: "bg-destructive text-destructive-foreground",
    bgClass: "bg-destructive/10",
    borderClass: "border-destructive/30",
    textClass: "text-destructive",
    id: "Pembayaran gagal",
    en: "Payment failed",
  },
  expired: {
    icon: AlertCircle,
    badgeVariant: "secondary",
    badgeClass: "bg-muted text-muted-foreground",
    bgClass: "bg-muted/30",
    borderClass: "border-border",
    textClass: "text-muted-foreground",
    id: "Pembayaran kedaluwarsa",
    en: "Payment expired",
  },
  unknown: {
    icon: AlertCircle,
    badgeVariant: "secondary",
    badgeClass: "bg-muted text-muted-foreground",
    bgClass: "bg-muted/30",
    borderClass: "border-border",
    textClass: "text-muted-foreground",
    id: "Status tidak diketahui",
    en: "Unknown status",
  },
};

const STATUS_DETAIL: Record<CheckoutStatus, { id: string; en: string } | null> = {
  completed: {
    id: "Pembayaran diterima. Plan atau add-on aktif otomatis.",
    en: "Payment received. Plan or add-on activated automatically.",
  },
  pending: {
    id: "Kami menunggu konfirmasi pembayaran dari Pakasir. Status akan diperbarui otomatis.",
    en: "Waiting for Pakasir to confirm payment. Status updates automatically.",
  },
  failed: {
    id: "Pembayaran tidak berhasil. Silakan coba checkout lagi.",
    en: "The payment did not go through. Please try checking out again.",
  },
  expired: {
    id: "Kode QRIS kedaluwarsa. Silakan buat checkout baru.",
    en: "The QRIS code expired. Please create a new checkout.",
  },
  unknown: null,
};

function formatDisplayAmount(rawAmount: string | null): string | null {
  if (!rawAmount) return null;
  const num = Number(rawAmount);
  if (!Number.isFinite(num)) return rawAmount;
  return `Rp ${Math.round(num).toLocaleString("id-ID")}`;
}

export function BillingCheckoutStatusCard({
  status,
  amount,
  lang,
}: {
  status: CheckoutStatus;
  amount: string | null;
  lang: "id" | "en";
}) {
  const [visible, setVisible] = useState(true);
  const meta = STATUS_META[status] ?? STATUS_META.unknown;
  const detail = STATUS_DETAIL[status];
  const Icon = meta.icon;
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  // Auto-clean query parameter from URL bar on mount so page reloads don't keep showing the alert
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("checkout")) {
        url.searchParams.delete("checkout");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border p-4 shadow-xs transition-all ${meta.bgClass} ${meta.borderClass}`}
    >
      <div className="flex items-start sm:items-center gap-3 pr-8 sm:pr-0">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/80 shadow-2xs ${meta.textClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-foreground">{t(meta.id, meta.en)}</p>
            {amount && (
              <span className="font-mono text-xs font-semibold text-foreground">
                ({formatDisplayAmount(amount)})
              </span>
            )}
          </div>
          {detail && <p className="text-[11px] text-muted-foreground">{t(detail.id, detail.en)}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Badge className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}>
          {t(meta.id, meta.en)}
        </Badge>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg p-1 text-muted-foreground hover:bg-background/80 hover:text-foreground transition-colors"
          title={t("Tutup", "Dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
