"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createPackageOrder } from "@/lib/actions/package-orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { portalLocale } from "@/lib/portal-i18n";

interface PackageOrderButtonProps {
  token: string;
  projectId: string;
  packageId: string;
  packageName: string;
  hours: number | null;
  price: string;
  currency: string;
  isHighlighted?: boolean;
}

export function PackageOrderButton({
  token,
  projectId,
  packageId,
  packageName,
  hours,
  price,
  currency,
  isHighlighted,
}: PackageOrderButtonProps) {
  const { lang, t } = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const formattedPrice = new Intl.NumberFormat(portalLocale(lang), {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(price));

  async function handleConfirm() {
    setLoading(true);
    try {
      await createPackageOrder({
        credential: token,
        projectId,
        packageId,
        message: message || null,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(
        t(
          `Pesanan ${packageName} terkirim!`,
          `Order for ${packageName} submitted!`,
        ),
      );
      setOpen(false);
      setMessage("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal mengirim pesanan", "Failed to submit order"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant={isHighlighted ? "default" : "outline"}
        size="sm"
        className="w-full mt-3"
        onClick={() => setOpen(true)}
      >
        {t("Pilih Paket Ini", "Choose This Package")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Konfirmasi Pesanan", "Confirm Order")}
            </DialogTitle>
            <DialogDescription>
              {t("Kamu memesan", "You are ordering")}{" "}
              <strong>{packageName}</strong>
              {hours && ` (${hours} ${t("jam", "hours")})`}{" "}
              {t("seharga", "for")} <strong>{formattedPrice}</strong>/
              {t("bulan", "month")}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="order-message" className="text-xs">
                {t("Pesan (opsional)", "Message (optional)")}
              </Label>
              <Textarea
                id="order-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(
                  "Kebutuhan khusus atau tanggal mulai...",
                  "Any specific requirements or start date...",
                )}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("Batal", "Cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading
                ? t("Mengirim...", "Submitting...")
                : t("Konfirmasi Pesanan", "Confirm Order")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
