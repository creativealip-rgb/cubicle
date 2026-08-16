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
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gradient-to-b from-slate-50 via-white to-white"}>
      <div className={embedded ? "space-y-6" : "max-w-3xl mx-auto p-4 md:p-8 space-y-6"}>
        {!embedded && (
          <div className="text-center pt-4">
            <Link href="/" className="inline-block text-xl font-semibold text-slate-900">
              Cubiqlo
            </Link>
            <p className="text-xs text-slate-500 mt-1">E-signature</p>
          </div>
        )}

        {topBar}

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="border-b bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Contract</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{contract.title}</h1>
            {(contract.clientName || contract.clientEmail) && (
              <p className="text-sm text-slate-500 mt-1">
                For: <span className="font-medium text-slate-700">{contract.clientName}</span>
                {contract.clientEmail && ` · ${contract.clientEmail}`}
              </p>
            )}
            {contract.validUntil && (
              <p className="text-xs text-slate-500 mt-1">
                Valid until:{" "}
                {new Date(contract.validUntil).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {statusBadge(contract.status) && <div className="mt-2">{statusBadge(contract.status)}</div>}
          </div>

          <div className="px-6 py-6 space-y-4">{blocks.map(renderBlock)}</div>

          <div className="border-t bg-slate-50 px-6 py-5">
            {signatureSlot ?? (
              <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
                Tempat tanda tangan client
              </div>
            )}
          </div>
        </div>

        <p className={embedded ? "text-xs text-slate-400 text-center" : "text-center text-xs text-slate-400"}>
          Powered by <Link href="/" className="hover:underline">Cubiqlo</Link>
        </p>
      </div>
    </div>
  );
}
