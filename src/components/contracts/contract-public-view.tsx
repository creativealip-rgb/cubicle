"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { DocumentBlock } from "@/lib/document-blocks";
import { renderDocumentBlockHtml } from "@/lib/document-block-renderer";
import type { DocumentPlaceholderValues } from "@/lib/document-placeholders";

/**
 * Single source of truth for rendering a contract's public-facing view.
 *
 * Used by THREE surfaces so they are byte-for-byte identical:
 *   1. the public `/contract/[token]` page (what the client receives via email),
 *   2. the internal preview page (`/app/contracts/[id]/preview`), and
 *   3. the in-editor preview modal (live blocks, before saving).
 *
 * Callers pass already-normalized `blocks`; the signature block is rendered
 * in the footer slot by the caller (interactive SignaturePad on the public
 * page, a static placeholder in the internal surfaces).
 */

export interface ContractViewData {
  title: string;
  contractNumber: string | null;
  clientName: string | null;
  clientEmail: string | null;
  validUntil: Date | string | null;
  status: string;
  signedAt?: Date | string | null;
  signedName?: string | null;
  signatureDataUrl?: string | null;
}

function statusBadge(status: string) {
  if (status === "viewed") return <Badge variant="secondary">Viewed — awaiting signature</Badge>;
  if (status === "sent") return <Badge variant="secondary">Awaiting signature</Badge>;
  if (status === "signed") return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Signed</Badge>;
  if (status === "declined") return <Badge variant="destructive">Declined</Badge>;
  return null;
}

function alignClass(align: string | undefined | null): string {
  return align === "center" ? "text-center" : align === "right" ? "text-right" : "";
}

function headingClass(level: number | undefined): string {
  if (level === 1) return "text-xl";
  if (level === 3) return "text-base";
  return "text-lg";
}

export function ContractPublicView({
  contract,
  blocks,
  placeholderValues,
  signatureSlot,
  topBar,
  embedded = false,
}: {
  contract: ContractViewData;
  blocks: DocumentBlock[];
  placeholderValues: DocumentPlaceholderValues;
  signatureSlot?: React.ReactNode;
  topBar?: React.ReactNode;
  embedded?: boolean;
}) {
  function renderBlock(block: DocumentBlock) {
    if (block.type === "signature") return null; // rendered in footer slot
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
              E-Signature & Legal Agreement
            </p>
          </div>
        )}

        {topBar}

        <div className="bg-card rounded-2xl border border-border/80 shadow-lg overflow-hidden">
          <div className="border-b border-border/60 bg-muted/10 px-6 sm:px-8 py-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0 h-5 border-primary/40 bg-primary/5 text-primary">
                Contract Document
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{contract.title}</h1>
            {(contract.clientName || contract.clientEmail) && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                Prepared for: <span className="font-semibold text-foreground">{contract.clientName}</span>
                {contract.clientEmail && ` · ${contract.clientEmail}`}
              </p>
            )}
            {contract.validUntil && (
              <p className="text-xs text-muted-foreground mt-1">
                Valid until:{" "}
                <span className="font-medium text-foreground">
                  {new Date(contract.validUntil).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
            {statusBadge(contract.status) && <div className="mt-3">{statusBadge(contract.status)}</div>}
          </div>

          <div className="px-6 sm:px-8 py-8 space-y-5 bg-card">{blocks.map(renderBlock)}</div>

          <div className="border-t border-border/60 bg-muted/10 px-6 sm:px-8 py-6">
            {signatureSlot ?? (
              <div className="rounded-xl border-2 border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                Client digital signature slot
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">
            Created securely using{" "}
            <Link href="/" className="font-semibold text-foreground hover:underline">
              Cubiqlo Contracts
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
