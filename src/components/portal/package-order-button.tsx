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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(price));

  async function handleConfirm() {
    setLoading(true);
    try {
      await createPackageOrder(token, projectId, packageId, packageName, hours, price, currency, message || undefined);
      toast.success(`Order for ${packageName} submitted!`);
      setOpen(false);
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit order");
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
        Take This Package
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pesanan</DialogTitle>
            <DialogDescription>
              You&apos;re ordering <strong>{packageName}</strong>
              {hours && ` (${hours} hours)`} for <strong>{formattedPrice}</strong>/month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="order-message" className="text-xs">Message (optional)</Label>
              <Textarea
                id="order-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any specific requirements or start date..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? "Mengirim..." : "Konfirmasi Pesanan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
