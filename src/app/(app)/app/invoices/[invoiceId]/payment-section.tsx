"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    paidAt: new Date().toISOString().split("T")[0],
    method: "bank_transfer",
    notes: "",
  });

  const paidSoFar = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, total - paidSoFar);

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
      toast.success("Payment recorded");
      setOpen(false);
      setForm({
        amount: "",
        paidAt: new Date().toISOString().split("T")[0],
        method: "bank_transfer",
        notes: "",
      });
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function fmtCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          Total: <strong>{fmtCurrency(total)}</strong>
        </span>
        <span>
          Paid: <strong>{fmtCurrency(paidSoFar)}</strong>
        </span>
        <span>
          Remaining: <strong>{fmtCurrency(remaining)}</strong>
        </span>
      </div>

      {payments.length > 0 && (
        <div className="border rounded-lg divide-y">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="font-mono font-medium">
                  {fmtCurrency(Number(p.amount))}
                </span>
                <span className="text-muted-foreground ml-2">
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "-"}
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
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Record Payment
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAt">Payment Date *</Label>
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
              <Label htmlFor="method">Method</Label>
              <Select
                value={form.method}
                onValueChange={(v) => setForm((p) => ({ ...p, method: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnotes">Notes</Label>
              <Input
                id="pnotes"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Payment reference..."
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
