"use client";

import { CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LineItem {
  description: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  unit_price?: number;
  amount: number;
}

interface ProposalPublicViewProps {
  proposal: {
    title: string;
    body: string | null;
    lineItems: unknown;
    subtotal: string;
    tax: string;
    total: string;
    currency: string;
    downPaymentPercent: string;
    validUntil: string | null;
    sentAt: Date | null;
  };
  formatMoney: (amount: string | number, currency: string) => string;
}

export function ProposalPublicView({ proposal, formatMoney }: ProposalPublicViewProps) {
  const items = (proposal.lineItems as LineItem[]) ?? [];
  const subtotal = proposal.subtotal ?? items.reduce((s, li) => s + Number(li.amount ?? 0), 0);
  const tax = proposal.tax ?? 0;
  const total = proposal.total ?? (subtotal + Number(tax));
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-semibold tracking-tight">{proposal.title}</h2>
        {proposal.validUntil && (
          <p className="text-sm text-slate-500 mt-1">Valid until {proposal.validUntil}</p>
        )}
      </div>

      {proposal.body && (
        <div className="prose prose-sm max-w-none text-slate-700">
          <ReactMarkdown>{proposal.body}</ReactMarkdown>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deskripsi</TableHead>
            <TableHead className="text-right w-20">Qty</TableHead>
            <TableHead className="text-right w-32">Harga satuan</TableHead>
            <TableHead className="text-right w-32">Jumlah</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((li, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{li.description}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">{li.quantity ?? li.qty ?? 1}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {formatMoney(li.unitPrice ?? li.unit_price ?? 0, proposal.currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm font-medium">
                {formatMoney(li.amount ?? 0, proposal.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="border-t pt-4 space-y-1 text-sm">
        <div className="flex justify-end gap-8">
          <span className="text-slate-500">Subtotal</span>
          <span className="tabular-nums w-32 text-right">{formatMoney(subtotal, proposal.currency)}</span>
        </div>
        {Number(tax) > 0 && (
          <div className="flex justify-end gap-8">
            <span className="text-slate-500">Tax</span>
            <span className="tabular-nums w-32 text-right">{formatMoney(tax, proposal.currency)}</span>
          </div>
        )}
        <div className="flex justify-end gap-8 pt-2 border-t">
          <span className="font-semibold">Total</span>
          <span className="tabular-nums w-32 text-right font-semibold">
            {formatMoney(total, proposal.currency)}
          </span>
        </div>
      </div>

      {parseFloat(proposal.downPaymentPercent) > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Uang muka untuk memulai</p>
            <p className="text-blue-700 mt-1">
              {proposal.downPaymentPercent}% ({formatMoney(
                parseFloat(proposal.total) * (parseFloat(proposal.downPaymentPercent) / 100),
                proposal.currency
              )}) is due upon acceptance to begin work.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
