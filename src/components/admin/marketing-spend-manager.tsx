"use client";

import { useState, useTransition } from "react";
import { deleteMarketingSpend, recordMarketingSpend } from "@/lib/actions/admin/marketing-spend";

type SpendRow = {
  id: string;
  spendDate: string;
  source: string;
  campaign: string | null;
  amount: string;
  currency: string;
  notes: string | null;
};

const money = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export default function MarketingSpendManager({ rows }: { rows: SpendRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    startTransition(async () => {
      try {
        await recordMarketingSpend({
          spendDate: String(data.get("spendDate")),
          source: String(data.get("source")),
          campaign: String(data.get("campaign") || "") || undefined,
          amount: String(data.get("amount")),
          currency: "IDR",
          notes: String(data.get("notes") || "") || undefined,
        });
        form.reset();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save spend");
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this spend record?")) return;
    setError(null);
    startTransition(async () => {
      try { await deleteMarketingSpend(id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete spend"); }
    });
  }

  return <section aria-labelledby="marketing-spend-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
    <div className="mb-3"><h2 id="marketing-spend-title" className="text-sm font-semibold text-slate-900">Marketing spend</h2><p className="text-[11px] text-slate-500">Record IDR acquisition costs and keep recent entries tidy.</p></div>
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <label className="text-[11px] text-slate-600">Date<input name="spendDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 block w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" /></label>
      <label className="text-[11px] text-slate-600">Source<input name="source" required maxLength={80} placeholder="Google Ads" className="mt-1 block w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" /></label>
      <label className="text-[11px] text-slate-600">Campaign <span className="text-slate-400">optional</span><input name="campaign" maxLength={120} className="mt-1 block w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" /></label>
      <label className="text-[11px] text-slate-600">Amount (IDR)<input name="amount" required inputMode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" className="mt-1 block w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" /></label>
      <label className="text-[11px] text-slate-600">Notes <span className="text-slate-400">optional</span><input name="notes" maxLength={500} className="mt-1 block w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" /></label>
      <button disabled={pending} className="self-end rounded-md bg-[#6647F0] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Add spend"}</button>
    </form>
    {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Recent marketing spend</caption><thead className="text-[11px] text-slate-500"><tr><th className="pb-2">Date</th><th className="pb-2">Source</th><th className="pb-2">Campaign</th><th className="pb-2 text-right">Amount</th><th className="pb-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="py-2">{row.spendDate}</td><td>{row.source}</td><td className="text-slate-500">{row.campaign || "—"}</td><td className="text-right tabular-nums">Rp{money.format(Number(row.amount))}</td><td className="text-right"><button type="button" disabled={pending} onClick={() => remove(row.id)} className="text-rose-600 hover:underline disabled:opacity-50">Delete</button></td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-3 text-xs text-slate-500">No spend recorded.</p>}</div>
  </section>;
}

export type { SpendRow };
