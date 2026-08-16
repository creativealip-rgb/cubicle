"use client";

import Link from "next/link";
import { CheckCircle2, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { DocumentBlock } from "@/lib/document-blocks";
import { renderDocumentBlockHtml } from "@/lib/document-block-renderer";
import type { DocumentPlaceholderValues } from "@/lib/document-placeholders";

/**
 * Single source of truth for rendering a proposal's public-facing view.
 *
 * Used by THREE surfaces so they are byte-for-byte identical:
 *   1. the public `/proposal/[token]` page (what the client receives via email),
 *   2. the internal preview page (`/app/proposals/[id]/preview`), and
 *   3. the in-editor preview modal (live blocks, before saving).
 *
 * Callers pass already-normalized `blocks`; the financial table (line items +
 * totals + down-payment) is rendered separately from the block list so pricing
 * always comes from the stored line items, not the document content.
 */

export interface ProposalLineItem {
  description: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  unit_price?: number;
  amount: number;
}

export interface ProposalViewData {
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  validUntil: Date | string | null;
  status: string;
  lineItems: ProposalLineItem[];
  subtotal: string | number | null;
  tax: string | number | null;
  total: string | number | null;
  currency: string;
  downPaymentPercent: string | number | null;
}

function alignClass(align: string | undefined | null): string {
  return align === "center" ? "text-center" : align === "right" ? "text-right" : "";
}

function headingClass(level: number | undefined): string {
  if (level === 1) return "text-xl";
  if (level === 3) return "text-base";
  return "text-lg";
}

export function ProposalPublicView({
  proposal,
  blocks,
  placeholderValues,
  signatureSlot,
  topBar,
  embedded = false,
}: {
  proposal: ProposalViewData;
  blocks: DocumentBlock[];
  placeholderValues: DocumentPlaceholderValues;
  signatureSlot?: React.ReactNode;
  topBar?: React.ReactNode;
  embedded?: boolean;
}) {
  const lineItems = proposal.lineItems ?? [];
  const currency = proposal.currency ?? "IDR";
  const subtotal = proposal.subtotal ?? lineItems.reduce((s, li) => s + Number(li.amount ?? 0), 0);
  const tax = proposal.tax ?? 0;
  const total = proposal.total ?? (Number(subtotal) + Number(tax));
  const dpPercent = Number(proposal.downPaymentPercent ?? 0);

  function renderBlock(block: DocumentBlock) {
    if (block.type === "heading") {
      return (
        <div
          key={block.id}
          className={`${headingClass(block.level)} font-semibold text-slate-900 ${alignClass(block.align)}`}
        >
          {renderDocumentBlockHtml(block, placeholderValues)}
        </div>
      );
    }
    return (
      <div key={block.id} className="text-slate-700">
        {renderDocumentBlockHtml(block, placeholderValues)}
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gradient-to-b from-slate-50 via-white to-white"}>
      <div className={embedded ? "space-y-6" : "max-w-3xl mx-auto p-4 md:p-8 space-y-6"}>
        {!embedded && (
          <div className="text-center pt-4">
            <Link href="/" className="inline-block text-xl font-semibold text-slate-900">
              Cubiqlo
            </Link>
            <p className="text-xs text-slate-500 mt-1">Proposals</p>
          </div>
        )}

        {topBar}

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="border-b bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Proposal</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{proposal.title}</h1>
            {proposal.clientName && (
              <p className="text-sm text-slate-500 mt-1">
                For: <span className="font-medium text-slate-700">{proposal.clientName}</span>
              </p>
            )}
            {proposal.validUntil && (
              <p className="text-xs text-slate-500 mt-1">
                Valid until:{" "}
                {new Date(proposal.validUntil).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {proposal.status === "viewed" && (
              <div className="mt-2"><Badge variant="secondary">Viewed — awaiting decision</Badge></div>
            )}
            {proposal.status === "sent" && (
              <div className="mt-2"><Badge variant="secondary">Awaiting decision</Badge></div>
            )}
            {proposal.status === "accepted" && (
              <div className="mt-2"><Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Accepted</Badge></div>
            )}
            {proposal.status === "declined" && (
              <div className="mt-2"><Badge variant="destructive">Declined</Badge></div>
            )}
          </div>

          <div className="px-6 py-6 space-y-4">
            {blocks.map(renderBlock)}
          </div>

          {lineItems.length > 0 && (
            <div className="px-6 pb-6">
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
                  {lineItems.map((li, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{li.description}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{li.quantity ?? li.qty ?? 1}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatMoney(li.unitPrice ?? li.unit_price ?? 0, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {formatMoney(li.amount ?? 0, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-4 mt-3 space-y-1 text-sm">
                <div className="flex justify-end gap-8">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="tabular-nums w-32 text-right">{formatMoney(subtotal, currency)}</span>
                </div>
                {Number(tax) > 0 && (
                  <div className="flex justify-end gap-8">
                    <span className="text-slate-500">Tax</span>
                    <span className="tabular-nums w-32 text-right">{formatMoney(tax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-end gap-8 pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="tabular-nums w-32 text-right font-semibold">
                    {formatMoney(total, currency)}
                  </span>
                </div>
              </div>

              {dpPercent > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 mt-4">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Uang muka untuk memulai</p>
                    <p className="text-blue-700 mt-1">
                      {dpPercent}% ({formatMoney(Number(total) * (dpPercent / 100), currency)}) is due upon acceptance to begin work.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {signatureSlot ? (
            <div className="border-t bg-slate-50 px-6 py-5">{signatureSlot}</div>
          ) : null}
        </div>

        <p className={embedded ? "text-xs text-slate-400 text-center" : "text-center text-xs text-slate-400"}>
          Powered by <Link href="/" className="hover:underline">Cubiqlo</Link>
        </p>
      </div>
    </div>
  );
}
