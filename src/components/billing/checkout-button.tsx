"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Plan = "solo" | "team";

export function CheckoutButton({
  plan,
  workspaceId,
  children,
  disabled = false,
}: {
  plan: Plan;
  workspaceId?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, ...(workspaceId ? { workspaceId } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat checkout");
      window.location.href = json.data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={checkout} disabled={disabled || loading} className="w-full bg-[#6647F0] text-white hover:bg-[#5333DD] disabled:bg-slate-200 disabled:text-slate-500">
        {disabled ? "Plan aktif" : loading ? "Membuat QRIS..." : children}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
