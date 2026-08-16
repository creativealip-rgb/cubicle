"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Check, Loader2, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { transitionPackageOrder } from "@/lib/actions/package-orders";
import { formatMoney } from "@/lib/utils";

export interface AdminPackageOrder {
  id: string;
  projectId: string;
  packageName: string;
  price: string;
  currency: string;
  hours: number | null;
  message: string | null;
  status: "pending" | "confirmed" | "invoiced" | "cancelled";
  createdAt: string;
}

export function PackageOrderAdminPanel({ orders }: { orders: AdminPackageOrder[] }) {
  const { refresh } = useAppTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function decide(orderId: string, decision: "confirm" | "cancel") {
    setLoadingId(orderId);
    try {
      await transitionPackageOrder({ orderId, decision });
      toast.success(decision === "confirm" ? "Order dikonfirmasi" : "Order dibatalkan");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memproses order");
    } finally {
      setLoadingId(null);
    }
  }

  if (orders.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Order Paket</h2>
        <p className="text-sm text-muted-foreground">Konfirmasi permintaan paket dari portal klien.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.packageName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(order.price, order.currency)}
                    {order.hours != null ? ` · ${order.hours} jam` : ""}
                  </p>
                </div>
                <Badge variant={order.status === "pending" ? "secondary" : "outline"}>{order.status}</Badge>
              </div>
              {order.message ? <p className="text-sm text-muted-foreground">{order.message}</p> : null}
              {order.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide(order.id, "confirm")} disabled={loadingId === order.id}>
                    {loadingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Konfirmasi
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(order.id, "cancel")} disabled={loadingId === order.id}>
                    <X className="h-4 w-4" /> Batal
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShoppingCart className="h-3.5 w-3.5" /> Order sudah diproses
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
