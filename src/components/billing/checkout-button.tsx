"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Plan = "solo" | "team";
type Period = "monthly" | "yearly";

const PERIOD_STORAGE_KEY = "cubiqlo:billing:period";

function loadStoredPeriod(): Period {
  if (typeof window === "undefined") return "yearly";
  try {
    const stored = window.localStorage.getItem(PERIOD_STORAGE_KEY);
    return stored === "monthly" || stored === "yearly" ? stored : "yearly";
  } catch {
    return "yearly";
  }
}

export function CheckoutButton({
  plan,
  children,
  disabled = false,
}: {
  plan: Plan;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted period after hydration (defaults to yearly).
  useEffect(() => {
    setPeriod(loadStoredPeriod());
  }, []);

  function selectPeriod(next: Period) {
    setPeriod(next);
    try {
      window.localStorage.setItem(PERIOD_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — period still applies for this checkout.
    }
  }

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, period }),
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
    <div className="space-y-3">
      {!disabled && (
        <div
          role="tablist"
          aria-label="Billing period"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-600"
        >
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={period === option}
              onClick={() => selectPeriod(option)}
              className={cn(
                "inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-all",
                period === option
                  ? "bg-white text-slate-950 shadow"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {option === "monthly" ? "Bulanan" : "Tahunan · hemat 2x"}
            </button>
          ))}
        </div>
      )}
      <Button onClick={checkout} disabled={disabled || loading} className="w-full bg-[#6647F0] text-white hover:bg-[#5333DD] disabled:bg-slate-200 disabled:text-slate-500">
        {disabled ? "Plan aktif" : loading ? "Membuat QRIS..." : children}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
