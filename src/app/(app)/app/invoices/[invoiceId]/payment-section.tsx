"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppTransition } from "@/lib/transition-provider";
import { recordPayment } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { getInvoicePaymentState } from "@/lib/invoice-payment-rules";
import { useT } from "@/lib/i18n-client";

interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  paidAt: string | null;
  method: string | null;
  notes: string | null;
  createdAt: string;
}

export function PaymentSection({
  invoiceId,
  payments,
  total,
  currency,
}: {
  invoiceId: string;
  payments: Payment[];
  total: number;
  currency: string;
}) {
  const { refresh } = useAppTransition();
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    paidAt: new Date().toISOString().split("T")[0],
    method: "bank_transfer",
    notes: "",
  });

  const currencyCode = currency || "IDR";
  const paidSoFar = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const { remaining, fullyPaid } = getInvoicePaymentState(total, paidSoFar);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await recordPayment({
        invoiceId,
        amount: Number(form.amount),
        paidAt: form.paidAt,
        method: form.method || undefined,
        notes: form.notes || undefined,
      });
      toast.success(t("Pembayaran dicatat", "Payment recorded"));
      setOpen(false);
      setForm({
        amount: "",
        paidAt: new Date().toISOString().split("T")[0],
        method: "bank_transfer",
        notes: "",
      });
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          {t("Total", "Total")}: <strong>{formatMoney(total, currencyCode)}</strong>
        </span>
        <span aria-label={`${t("Dibayar", "Paid")}: ${formatMoney(paidSoFar, currencyCode)}`}>
          <span>{t("Dibayar", "Paid")}</span>: <strong>{formatMoney(paidSoFar, currencyCode)}</strong>
        </span>
        <span aria-label={`${t("Sisa", "Remaining")}: ${formatMoney(remaining, currencyCode)}`}>
          <span>{t("Sisa", "Remaining")}</span>: <strong>{formatMoney(remaining, currencyCode)}</strong>
        </span>
      </div>

      {payments.length > 0 && (
        <div className="border rounded-lg divide-y">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="font-mono font-medium">
                  {formatMoney(Number(p.amount), currencyCode)}
                </span>
                <span className="text-muted-foreground ml-2">
                  {p.paidAt ? new Date(`${p.paidAt}T00:00:00`).toLocaleDateString(locale) : "—"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {p.method || "N/A"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1" disabled={fullyPaid}>
            <Plus className="h-3.5 w-3.5" /> {t("Catat Pembayaran", "Record Payment")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Catat Pembayaran", "Record Payment")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("Jumlah *", "Amount *")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAt">{t("Tanggal Pembayaran *", "Payment Date *")}</Label>
              <Input
                id="paidAt"
                type="date"
                value={form.paidAt}
                onChange={(e) =>
                  setForm((p) => ({ ...p, paidAt: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">{t("Metode", "Method")}</Label>
              <Select
                value={form.method}
                onValueChange={(v) => setForm((p) => ({ ...p, method: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t("Transfer Bank", "Bank Transfer")}</SelectItem>
                  <SelectItem value="credit_card">{t("Kartu Kredit", "Credit Card")}</SelectItem>
                  <SelectItem value="cash">{t("Tunai", "Cash")}</SelectItem>
                  <SelectItem value="check">{t("Cek", "Check")}</SelectItem>
                  <SelectItem value="other">{t("Lainnya", "Other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnotes">{t("Catatan", "Notes")}</Label>
              <Input
                id="pnotes"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder={t("Referensi pembayaran...", "Payment reference...")}
              />
            </div>
            <LoadingButton type="submit" loading={loading} loadingText={t("Mencatat...", "Recording...")} className="w-full">
              {t("Catat Pembayaran", "Record Payment")}
              </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>
      {fullyPaid && (
        <p className="text-xs text-amber-700">
          {t("Pembayaran sudah penuh. Ubah status invoice menjadi Lunas secara manual jika diperlukan.", "Payment is complete. Mark the invoice as Paid manually if needed.")}
        </p>
      )}
    </div>
  );
}
