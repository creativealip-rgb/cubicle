"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DisplayCurrency } from "@/lib/landing-pricing";

export function LandingCurrencySwitch({ initialCurrency }: { initialCurrency: DisplayCurrency }) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initialCurrency);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function change(next: DisplayCurrency) {
    if (next === currency || pending) return;
    setPending(true); setError(false);
    try {
      const response = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: next }) });
      if (!response.ok) throw new Error("Currency preference update failed");
      setCurrency(next); router.refresh();
    } catch { setError(true); }
    finally { setPending(false); }
  }
  return <div role="group" className="inline-flex items-center rounded-xl bg-white p-1 text-xs shadow-sm ring-1 ring-slate-200" aria-label="Currency / Mata uang">
    {(["IDR", "USD"] as const).map(value => <button key={value} type="button" disabled={pending} aria-pressed={currency === value} onClick={() => change(value)} className={`rounded-lg px-2.5 py-1.5 font-semibold ${currency === value ? "bg-[#292D34] text-white" : "text-slate-500"}`}>{value}</button>)}
    {error && <span role="status" className="sr-only">Currency update failed. Pembaruan mata uang gagal.</span>}
  </div>;
}

export default LandingCurrencySwitch;
