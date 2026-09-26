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
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-10 px-4 sm:px-6"}>
      <div className={embedded ? "space-y-6" : "max-w-2xl mx-auto space-y-6"}>
        {!embedded && (
          <div className="text-center space-y-1">
            <Link href="/" className="inline-block text-2xl font-black tracking-tight text-foreground">
              Cubiqlo
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proposal & Scope Estimation
            </p>
          </div>
        )}

        {topBar}

        <div className="bg-card rounded-2xl border border-border/80 shadow-lg overflow-hidden">
          <div className="border-b border-border/60 bg-muted/10 px-6 sm:px-8 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0 h-5 border-primary/40 bg-primary/5 text-primary">
                Proposal Document
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{proposal.title}</h1>
            {(proposal.clientName || proposal.clientEmail) && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                Prepared for: <span className="font-semibold text-foreground">{proposal.clientName}</span>
                {proposal.clientEmail && ` · ${proposal.clientEmail}`}
              </p>
            )}
            {proposal.validUntil && (
              <p className="text-xs text-muted-foreground mt-1">
                Valid until:{" "}
                <span className="font-medium text-foreground">
                  {new Date(proposal.validUntil).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
            {proposal.status === "viewed" && (
              <div className="mt-3"><Badge variant="secondary">Viewed — awaiting decision</Badge></div>
            )}
            {proposal.status === "sent" && (
              <div className="mt-3"><Badge variant="secondary">Awaiting decision</Badge></div>
            )}
            {proposal.status === "accepted" && (
              <div className="mt-3"><Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Accepted</Badge></div>
            )}
            {proposal.status === "declined" && (
              <div className="mt-3"><Badge variant="destructive">Declined</Badge></div>
            )}
          </div>

          <div className="px-6 sm:px-8 py-8 space-y-5 bg-card">
            {blocks.map(renderBlock)}
          </div>

          {lineItems.length > 0 && (
            <div className="border-t border-border/60 bg-muted/10 px-6 sm:px-8 py-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Itemized Scope & Pricing Breakdown
              </h3>
              <div className="rounded-xl border border-border/80 bg-background overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-muted-foreground text-[11px] uppercase font-bold">
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-20">Qty</TableHead>
                      <TableHead className="text-right w-32">Unit Price</TableHead>
                      <TableHead className="text-right w-32">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((li, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs sm:text-sm font-medium">{li.description}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs sm:text-sm font-mono">{li.quantity ?? li.qty ?? 1}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs sm:text-sm font-mono">
                          {formatMoney(li.unitPrice ?? li.unit_price ?? 0, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs sm:text-sm font-mono font-bold text-foreground">
                          {formatMoney(li.amount ?? 0, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-xl border border-border/80 bg-background p-4 space-y-1.5 text-xs text-right max-w-xs ml-auto shadow-2xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">{formatMoney(subtotal, currency)}</span>
                </div>
                {Number(tax) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="font-mono font-medium">{formatMoney(tax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground border-t border-border/60 pt-1.5">
                  <span>Total Investment</span>
                  <span className="font-mono text-primary font-bold">{formatMoney(total, currency)}</span>
                </div>
              </div>

              {dpPercent > 0 && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Down Payment Terms</p>
                    <p className="text-muted-foreground mt-0.5">
                      {dpPercent}% ({formatMoney(Number(total) * (dpPercent / 100), currency)}) is due upon proposal acceptance to commence project execution.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {signatureSlot ? (
            <div className="border-t border-border/60 bg-muted/10 px-6 sm:px-8 py-6">{signatureSlot}</div>
          ) : null}
        </div>

        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">
            Created securely using{" "}
            <Link href="/" className="font-semibold text-foreground hover:underline">
              Cubiqlo Proposals
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
