"use client";

import { useState, useTransition } from "react";
import { deleteMarketingSpend, recordMarketingSpend } from "@/lib/actions/admin/marketing-spend";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);

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
        setDialogOpen(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save spend");
      }
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteMarketingSpend(id);
        setDeleteId(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete spend");
      }
    });
  }

  return (
    <section aria-labelledby="marketing-spend-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="marketing-spend-title" className="text-sm font-semibold text-slate-900">Marketing spend</h2>
          <p className="text-[11px] text-slate-500">Record IDR acquisition costs and keep recent entries tidy.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button type="button" className="rounded-md bg-[#6647F0] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5738df]">
              Record spend
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record marketing spend</DialogTitle>
              <DialogDescription>Add acquisition cost to recent spend records.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-700">Date<input name="spendDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1.5 block h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm" /></label>
              <label className="text-xs font-medium text-slate-700">Source<input name="source" required maxLength={80} placeholder="Google Ads" className="mt-1.5 block h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm" /></label>
              <label className="text-xs font-medium text-slate-700">Campaign <span className="font-normal text-slate-400">optional</span><input name="campaign" maxLength={120} className="mt-1.5 block h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm" /></label>
              <label className="text-xs font-medium text-slate-700">Amount (IDR)<input name="amount" required inputMode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" className="mt-1.5 block h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm" /></label>
              <label className="text-xs font-medium text-slate-700 sm:col-span-2">Notes <span className="font-normal text-slate-400">optional</span><textarea name="notes" maxLength={500} rows={3} className="mt-1.5 block w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm" /></label>
              {error && <p role="alert" className="text-xs text-rose-600 sm:col-span-2">{error}</p>}
              <DialogFooter className="sm:col-span-2">
                <button type="button" disabled={pending} onClick={() => setDialogOpen(false)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={pending} className="rounded-md bg-[#6647F0] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save spend"}</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-y border-slate-100 py-2 text-xs text-slate-600">
        <span>Total recorded: <strong className="tabular-nums text-slate-900">Rp{money.format(total)}</strong></span>
        <span>Recent entries: <strong className="tabular-nums text-slate-900">{rows.length}</strong></span>
      </div>
      {error && !dialogOpen && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full text-left text-xs"><caption className="sr-only">Recent marketing spend</caption><thead className="text-[11px] text-slate-500"><tr><th className="pb-2">Date</th><th className="pb-2">Source</th><th className="pb-2">Campaign</th><th className="pb-2 text-right">Amount</th><th className="pb-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="py-2">{row.spendDate}</td><td>{row.source}</td><td className="text-slate-500">{row.campaign || "—"}</td><td className="text-right tabular-nums">Rp{money.format(Number(row.amount))}</td><td className="text-right"><button type="button" disabled={pending} onClick={() => setDeleteId(row.id)} className="text-rose-600 hover:underline disabled:opacity-50">Delete</button></td></tr>)}</tbody></table>
      </div>
      <div className="mt-4 space-y-2 md:hidden">
        {rows.map((row) => <article key={row.id} className="rounded-lg border border-slate-100 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-900">{row.source}</p><p className="text-xs text-slate-500">{row.spendDate}{row.campaign ? ` · ${row.campaign}` : ""}</p></div><p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">Rp{money.format(Number(row.amount))}</p></div><button type="button" disabled={pending} onClick={() => setDeleteId(row.id)} className="mt-2 text-xs text-rose-600 hover:underline disabled:opacity-50">Delete</button></article>)}
      </div>
      {rows.length === 0 && <p className="py-6 text-center text-xs text-slate-500">No spend recorded yet. Record first spend to start tracking acquisition costs.</p>}
      <Dialog open={!!deleteId} onOpenChange={(open) => !pending && !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete spend record?</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><button type="button" disabled={pending} onClick={() => setDeleteId(null)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Cancel</button><button type="button" disabled={pending} onClick={() => deleteId && remove(deleteId)} className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Deleting…" : "Delete"}</button></DialogFooter></DialogContent>
      </Dialog>
    </section>
  );
}

export type { SpendRow };
