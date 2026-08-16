import Link from "next/link";
import { ArrowLeft, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentBlockEditor } from "@/components/documents/document-block-editor";
import {
  defaultDocumentBlocks,
  normalizeDocumentBlocks,
} from "@/lib/document-blocks";
import {
  buildContractPlaceholderValues,
  buildProposalPlaceholderValues,
} from "@/lib/document-placeholder-values";
import {
  saveContractTemplateBlocks,
  saveProposalTemplateBlocks,
} from "@/lib/actions/template-blocks";

type TemplateEditorProps = {
  kind: "proposal" | "contract";
  workspaceId: string;
  template: {
    id: string;
    name: string;
    isDefault: boolean;
    contentBlocks: unknown;
  };
};

/**
 * Shared block-editor page for Template Center proposal/contract templates.
 *
 * Loads the template by workspace-scoped id (the caller already checked the
 * template belongs to the current workspace) and hands the existing
 * `contentBlocks` to the same `DocumentBlockEditor` used by live proposal and
 * contract documents. Saving goes through the workspace-scoped server actions
 * in `template-blocks.ts` — no CAS because templates have no content revision;
 * the server still normalizes and validates every block.
 *
 * Preview parity: a template has no concrete client/workspace/date yet, so we
 * pass SAMPLE metadata + placeholder values. This makes the in-editor preview
 * render through the same `ProposalPublicView` / `ContractPublicView` used by
 * real proposals/contracts, so placeholders resolve to illustrative values
 * (e.g. "Your Company", "Client Name") instead of showing raw `{{...}}` tokens.
 */
const SAMPLE_CLIENT = "Client Name";
const SAMPLE_CLIENT_EMAIL = "client@example.com";
const SAMPLE_WORKSPACE = "Your Company";
const SAMPLE_COMPANY = "Client Company";
const sampleValidUntil = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

export async function TemplateBlocksEditor({
  kind,
  workspaceId,
  template,
}: TemplateEditorProps) {
  const blocks = normalizeDocumentBlocks(template.contentBlocks, kind);
  const backTab = kind === "proposal" ? "proposal" : "contract";

  async function saveBlocks(
    next: Parameters<typeof saveProposalTemplateBlocks>[1]["contentBlocks"],
  ) {
    "use server";
    if (kind === "contract") {
      return saveContractTemplateBlocks(template.id, { contentBlocks: next });
    }
    return saveProposalTemplateBlocks(template.id, { contentBlocks: next });
  }

  const proposalMeta = kind === "proposal"
    ? {
        title: template.name,
        clientName: SAMPLE_CLIENT,
        clientEmail: SAMPLE_CLIENT_EMAIL,
        validUntil: sampleValidUntil(),
        status: "draft",
      }
    : undefined;

  const documentMeta = kind === "contract"
    ? {
        title: template.name,
        clientName: SAMPLE_CLIENT,
        clientEmail: SAMPLE_CLIENT_EMAIL,
        validUntil: sampleValidUntil(),
        contractNumber: "CNT-0001",
      }
    : undefined;

  const placeholderValues = kind === "proposal"
    ? buildProposalPlaceholderValues({
        clientName: SAMPLE_CLIENT,
        clientEmail: SAMPLE_CLIENT_EMAIL,
        companyName: SAMPLE_COMPANY,
        workspaceName: SAMPLE_WORKSPACE,
        proposalNumber: "PRO-0001",
        validUntil: sampleValidUntil(),
        today: new Date(),
      })
    : buildContractPlaceholderValues({
        clientName: SAMPLE_CLIENT,
        clientEmail: SAMPLE_CLIENT_EMAIL,
        companyName: SAMPLE_COMPANY,
        workspaceName: SAMPLE_WORKSPACE,
        contractNumber: "CNT-0001",
        contractDate: new Date(),
        validUntil: sampleValidUntil(),
        today: new Date(),
      });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 shrink-0">
            <Link href={`/app/templates?tab=${backTab}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Template Center
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{template.name}</h1>
            <p className="text-xs text-muted-foreground">
              {kind === "proposal"
                ? "Template proposal — blok dokumen"
                : "Template kontrak — blok dokumen"}
            </p>
          </div>
          {template.isDefault ? (
            <Badge variant="secondary" className="gap-1 shrink-0">
              <Star className="h-3 w-3 text-amber-500" />
              Default
            </Badge>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/app/templates?tab=${backTab}`}>
            <ExternalLink className="h-3.5 w-3.5" />
            Template Center
          </Link>
        </Button>
      </div>
      <DocumentBlockEditor
        kind={kind}
        workspaceId={workspaceId}
        initialBlocks={blocks.length ? blocks : defaultDocumentBlocks(kind)}
        saveBlocks={saveBlocks}
        proposalMeta={proposalMeta}
        documentMeta={documentMeta}
        placeholderValues={placeholderValues}
      />
    </div>
  );
}
