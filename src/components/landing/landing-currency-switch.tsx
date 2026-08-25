"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DisplayCurrency } from "@/lib/landing-pricing";

export function LandingCurrencySwitch({ initialCurrency }: { initialCurrency: DisplayCurrency }) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initialCurrency);
  const [pending, setPending] = useState(false);
  async function change(next: DisplayCurrency) {
    if (next === currency || pending) return;
    setCurrency(next); setPending(true);
    try { await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: next }) }); router.refresh(); }
    finally { setPending(false); }
  }
  return <div className="inline-flex items-center rounded-xl bg-white p-1 text-xs shadow-sm ring-1 ring-slate-200" aria-label="Currency">
    {(["IDR", "USD"] as const).map(value => <button key={value} type="button" disabled={pending} aria-pressed={currency === value} onClick={() => change(value)} className={`rounded-lg px-2.5 py-1.5 font-semibold ${currency === value ? "bg-[#292D34] text-white" : "text-slate-500"}`}>{value}</button>)}
  </div>;
}

export default LandingCurrencySwitch;
