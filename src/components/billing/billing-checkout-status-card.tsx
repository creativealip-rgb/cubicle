import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CheckoutStatus } from "@/lib/billing-checkout-status";

const STATUS_META: Record<
  CheckoutStatus,
  { badge: "success" | "warning" | "destructive" | "info" | "secondary"; id: string; en: string }
> = {
  pending: { badge: "warning", id: "Menunggu pembayaran", en: "Payment pending" },
  completed: { badge: "success", id: "Pembayaran berhasil", en: "Payment completed" },
  failed: { badge: "destructive", id: "Pembayaran gagal", en: "Payment failed" },
  expired: { badge: "secondary", id: "Pembayaran kedaluwarsa", en: "Payment expired" },
  unknown: { badge: "secondary", id: "Status tidak diketahui", en: "Unknown status" },
};

const STATUS_DETAIL: Record<
  CheckoutStatus,
  { id: string; en: string } | null
> = {
  pending: {
    id: "Kami menunggu konfirmasi pembayaran dari Pakasir. Status akan diperbarui otomatis setelah webhook diterima.",
    en: "Waiting for Pakasir to confirm the payment. Status updates automatically once the webhook is received.",
  },
  completed: {
    id: "Pembayaran diterima. Plan atau add-on aktif otomatis.",
    en: "Payment received. Plan or add-on activated automatically.",
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

/**
 * Bilingual checkout status card shown on the billing page after a Pakasir
 * redirect. Renders ONLY the mapped status + amount — never the raw provider
 * payload.
 */
export function BillingCheckoutStatusCard({
  status,
  amount,
  lang,
}: {
  status: CheckoutStatus;
  amount: string | null;
  lang: "id" | "en";
}) {
  const meta = STATUS_META[status];
  const detail = STATUS_DETAIL[status];
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  return (
    <Card className="border-slate-200">
      <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-950">{t(meta.id, meta.en)}</p>
          {detail && <p className="text-sm text-slate-600">{t(detail.id, detail.en)}</p>}
        </div>
        <div className="flex items-center gap-3">
          {amount && <span className="text-sm font-medium text-slate-600">{t("Rp", "Rp")} {amount}</span>}
          <Badge variant={meta.badge}>{t(meta.id, meta.en)}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
