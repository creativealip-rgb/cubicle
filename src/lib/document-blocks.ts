export type DocumentBlockType = "heading" | "text" | "list" | "divider" | "placeholder" | "signature" | "image" | "attachment" | "table" | "logo";

export type DocumentTableRow = string[];

export type DocumentBlockAlign = "left" | "center" | "right";

export type DocumentBlock = {
  id: string;
  type: DocumentBlockType;
  content?: string;
  level?: 1 | 2 | 3;
  items?: string[];
  ordered?: boolean;
  align?: DocumentBlockAlign;
  src?: string;
  fileName?: string;
  fileId?: string;
  mimeType?: string;
  sizeBytes?: number;
  rows?: DocumentTableRow[];
  logoSize?: "sm" | "md" | "lg";
};

const allowed: Record<"proposal" | "contract", DocumentBlockType[]> = {
  proposal: ["heading", "text", "list", "divider", "placeholder", "image", "attachment", "table", "logo"],
  contract: ["heading", "text", "list", "divider", "placeholder", "signature", "table", "image", "logo"],
};

const KNOWN_TYPES = new Set(Object.values(allowed).flat());

/** True when the value is a well-formed document block of a known type. */
export function isDocumentBlock(value: unknown): value is DocumentBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as Partial<DocumentBlock>;
  if (typeof block.id !== "string" || !block.id) return false;
  if (typeof block.type !== "string" || !KNOWN_TYPES.has(block.type as DocumentBlockType)) return false;
  return true;
}

/** True when the block payload is safe to store and render. */
export function isSafeDocumentBlock(value: unknown): value is DocumentBlock {
  if (!isDocumentBlock(value)) return false;
  const block = value as Partial<DocumentBlock>;
  if (block.content !== undefined && typeof block.content !== "string") return false;
  if (block.level !== undefined && block.level !== 1 && block.level !== 2 && block.level !== 3) return false;
  if (block.items !== undefined && !Array.isArray(block.items)) return false;
  if (block.items !== undefined && !block.items.every((item) => typeof item === "string")) return false;
  if (block.ordered !== undefined && typeof block.ordered !== "boolean") return false;
  if (block.align !== undefined && block.align !== "left" && block.align !== "center" && block.align !== "right") return false;
  if (block.rows !== undefined && !isSafeTableRows(block.rows)) return false;
  if (block.src !== undefined && typeof block.src !== "string") return false;
  if (block.fileName !== undefined && typeof block.fileName !== "string") return false;
  if (block.fileId !== undefined && typeof block.fileId !== "string") return false;
  if (block.mimeType !== undefined && typeof block.mimeType !== "string") return false;
  if (block.sizeBytes !== undefined && (typeof block.sizeBytes !== "number" || !Number.isFinite(block.sizeBytes) || block.sizeBytes < 0)) return false;
  return true;
}

function isSafeTableRows(rows: unknown): rows is DocumentTableRow[] {
  if (!Array.isArray(rows)) return false;
  if (rows.length > 50) return false;
  return rows.every(
    (row) =>
      Array.isArray(row) &&
      row.length <= 12 &&
      row.every((cell) => typeof cell === "string" && cell.length <= 500),
  );
}

/**
 * Filter raw (untrusted, e.g. from client JSON or legacy storage) input down to
 * well-formed blocks allowed for the document kind. Payload fields that fail
 * structural checks are dropped entirely so a malicious block cannot smuggle
 * scripts, oversized tables, or non-string cell values into storage.
 */
export function normalizeDocumentBlocks(value: unknown, kind: "proposal" | "contract"): DocumentBlock[] {
  if (!Array.isArray(value)) return [];
  const allowedTypes = allowed[kind];
  return value.filter((block): block is DocumentBlock => {
    if (!isSafeDocumentBlock(block)) return false;
    if (!allowedTypes.includes(block.type)) return false;
    if (block.type === "list" && !Array.isArray(block.items)) return false;
    if (block.type === "table" && !isSafeTableRows(block.rows)) return false;
    if (block.type === "image" || block.type === "attachment") {
      // Media blocks require at least one of src/fileId/fileName; otherwise
      // they are inert and rejected instead of rendering broken placeholders.
      const hasAny = Boolean(block.src || block.fileId || block.fileName);
      if (!hasAny) return false;
    }
    return true;
  });
}

export function defaultDocumentBlocks(kind: "proposal" | "contract"): DocumentBlock[] {
  return kind === "contract"
    ? [
        { id: crypto.randomUUID(), type: "heading", level: 1, content: "Perjanjian" },
        { id: crypto.randomUUID(), type: "text", content: "{{client_name}}" },
        { id: crypto.randomUUID(), type: "heading", level: 2, content: "Pasal 1" },
        { id: crypto.randomUUID(), type: "text", content: "" },
        { id: crypto.randomUUID(), type: "signature" },
      ]
    : [{ id: crypto.randomUUID(), type: "heading", level: 1, content: "Proposal" }, { id: crypto.randomUUID(), type: "text", content: "" }];
}

/**
 * Starter blocks for a fresh proposal: cover header, standard sections, and
 * a financial table. Placeholder tokens ({{workspace_name}}, {{client_name}},
 * {{valid_until}}) resolve through the shared {{key}} resolver.
 */
export function buildProposalStarterBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "logo", align: "center", logoSize: "md" },
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Project Proposal", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "Prepared for: {{client_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Executive Summary" },
    { id: crypto.randomUUID(), type: "text", content: "Thank you for the opportunity to submit this proposal. We are pleased to provide the solution outlined below to achieve your goals." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Scope of Work & Deliverables" },
    { id: crypto.randomUUID(), type: "list", items: ["Discovery, strategy & architecture", "Design, implementation & development", "Quality assurance, review & deployment"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Investment & Pricing" },
    { id: crypto.randomUUID(), type: "table", rows: [["Item / Deliverable", "Est. Hours / Qty", "Amount"], ["Core Project Scope", "1", "{{total_amount}}"]] },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Timeline & Milestones" },
    { id: crypto.randomUUID(), type: "text", content: "Estimated kickoff upon signature and down payment. Target delivery within 4–6 weeks." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Terms & Conditions" },
    { id: crypto.randomUUID(), type: "text", content: "This proposal is valid until {{valid_until}}. Payment terms: 50% down payment to initiate work, 50% upon final acceptance." },
  ];
}

export function buildMarketingProposalBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "logo", align: "center", logoSize: "md" },
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Digital Marketing & Growth Proposal", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "Target Client: {{client_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Strategic Growth Objectives" },
    { id: crypto.randomUUID(), type: "text", content: "Accelerate online engagement, customer acquisition, and brand visibility through targeted organic and performance campaigns." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Campaign Channels & Execution" },
    { id: crypto.randomUUID(), type: "list", items: ["Content marketing & social media management", "Search engine optimization (SEO & SEM)", "Paid performance ads & monthly reporting"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Monthly Retainer & Budget" },
    { id: crypto.randomUUID(), type: "table", rows: [["Package / Service", "Frequency", "Investment"], ["Growth Retainer Plan", "Monthly", "{{total_amount}}"]] },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Reporting & SLA" },
    { id: crypto.randomUUID(), type: "text", content: "Monthly analytics reports with transparent KPIs delivered every end-of-month." },
  ];
}

export function buildBrandDesignProposalBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "logo", align: "center", logoSize: "md" },
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Brand Identity & UI/UX Design Proposal", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "Prepared for: {{client_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Design Vision & Creative Direction" },
    { id: crypto.randomUUID(), type: "text", content: "Craft a distinct, high-impact visual identity and intuitive digital interface tailored for modern product positioning." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Design Deliverables" },
    { id: crypto.randomUUID(), type: "list", items: ["Brand Guidelines, Typography & Color Palette", "Figma Interactive Prototypes & UI Design System", "High-Resolution Design Assets & Iconography"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Design Investment" },
    { id: crypto.randomUUID(), type: "table", rows: [["Design Phase", "Revisions", "Fee"], ["Complete UI/UX & Brand Pack", "Up to 3 Rounds", "{{total_amount}}"]] },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Signatures" },
    { id: crypto.randomUUID(), type: "signature" },
  ];
}

export function buildContractStarterBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "logo", align: "center", logoSize: "md" },
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Service Agreement", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "Contract No. {{contract_number}}", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{contract_date}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Parties" },
    { id: crypto.randomUUID(), type: "text", content: "This Service Agreement is entered into on {{contract_date}} between {{workspace_name}} (\u201cService Provider\u201d) and {{client_name}} (\u201cClient\u201d)." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Background" },
    { id: crypto.randomUUID(), type: "text", content: "The Client desires to retain Service Provider to perform professional services as agreed." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Services & Scope" },
    { id: crypto.randomUUID(), type: "list", items: ["Execution of deliverables as specified in scope", "Ongoing communication and milestone approvals", "Handover of final working assets"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Contract Value & Payment" },
    { id: crypto.randomUUID(), type: "table", rows: [["Description", "Amount"], ["Professional Services", "{{contract_value}}"]] },
    { id: crypto.randomUUID(), type: "text", content: "A down payment of 50% is due upon signing; the remaining balance is due upon completion. Invoices are payable within 14 days of receipt." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Term & Termination" },
    { id: crypto.randomUUID(), type: "text", content: "This Agreement begins on {{contract_date}} and remains in effect until {{valid_until}}." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Confidentiality" },
    { id: crypto.randomUUID(), type: "text", content: "Both parties agree to treat all proprietary information and commercial terms as strictly confidential." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Intellectual Property" },
    { id: crypto.randomUUID(), type: "text", content: "Upon full payment, all intellectual property rights for created deliverables transfer exclusively to the Client." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Liability & Indemnification" },
    { id: crypto.randomUUID(), type: "text", content: "Neither party shall be liable for indirect, incidental, or consequential damages arising from this agreement." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Signatures" },
    { id: crypto.randomUUID(), type: "signature" },
  ];
}

export function buildNdaContractBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "logo", align: "center", logoSize: "md" },
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Non-Disclosure Agreement (NDA)", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "Ref: {{contract_number}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "1. The Parties" },
    { id: crypto.randomUUID(), type: "text", content: "This Mutual Non-Disclosure Agreement is entered into between {{workspace_name}} and {{client_name}}." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "2. Definition of Confidential Information" },
    { id: crypto.randomUUID(), type: "text", content: "Confidential information includes all technical, commercial, financial, and strategic information disclosed by either party." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "3. Non-Disclosure Obligations" },
    { id: crypto.randomUUID(), type: "list", items: ["Maintain strict confidentiality using at least reasonable care", "Not disclose to third parties without prior written consent", "Use solely for evaluating potential business cooperation"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "4. Duration" },
    { id: crypto.randomUUID(), type: "text", content: "This NDA shall remain in effect for a period of 2 years from {{contract_date}}." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "5. Signatures" },
    { id: crypto.randomUUID(), type: "signature" },
  ];
}

export function buildRetainerContractBlocks(): DocumentBlock[] {
  return [
    { id: crypto.randomUUID(), type: "logo", align: "center", logoSize: "md" },
    { id: crypto.randomUUID(), type: "heading", level: 1, content: "Monthly Retainer & Support Agreement", align: "center" },
    { id: crypto.randomUUID(), type: "text", content: "{{workspace_name}} & {{client_name}}", align: "center" },
    { id: crypto.randomUUID(), type: "divider" },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Scope of Recurring Services" },
    { id: crypto.randomUUID(), type: "list", items: ["Dedicated monthly engineering & maintenance hours", "Priority SLA response time (within 24 business hours)", "Periodic system health checks & optimization"], ordered: false },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Monthly Fee & Billing" },
    { id: crypto.randomUUID(), type: "table", rows: [["Retainer Tier", "Monthly Hours", "Rate"], ["Dedicated Support Plan", "Monthly Recurring", "{{contract_value}}"]] },
    { id: crypto.randomUUID(), type: "text", content: "Billed automatically at the beginning of each billing cycle with Net 7 payment terms." },
    { id: crypto.randomUUID(), type: "heading", level: 2, content: "Signatures" },
    { id: crypto.randomUUID(), type: "signature" },
  ];
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "tiff", "ico"]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** True when the block's src points at the same-origin file download proxy. */
export function isSameOriginMediaSrc(src: string): boolean {
  try {
    return new URL(src, "http://local.invalid").pathname.startsWith("/api/files/");
  } catch {
    return false;
  }
}

/**
 * Build a media block (`image` or `attachment`) from a workspace file record.
 *
 * The same-origin `src` (`/api/files/...`) is derived from the file id so
 * the block passes `isSafeImageBlock` / `isSafeAttachmentMeta` and renders in
 * editor preview, public proposal, and (for attachments) the download link.
 * `fileId` is the workspace-scoped `files` row id, so the download route can
 * authorize access. Throws when the record is missing the fields a safe media
 * block needs.
 */
export function buildDocumentMediaBlock(
  kind: "image" | "attachment",
  file: {
    id: string;
    name: string;
    storageKey: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  },
): DocumentBlock {
  if (!file.id || !file.name || !file.storageKey) {
    throw new Error("Uploaded file record is incomplete");
  }
  const src = `/api/files/${file.id}/download`;
  return {
    id: crypto.randomUUID(),
    type: kind,
    src,
    fileName: file.name,
    fileId: file.id,
    mimeType: file.mimeType ?? undefined,
    sizeBytes: file.sizeBytes ?? undefined,
  };
}

/** True when the attachment block carries safe metadata (id, name, mime, size). */
export function isSafeAttachmentMeta(block: DocumentBlock): boolean {
  if (!block.fileId) return false;
  const fileName = block.fileName ?? "";
  if (!fileName || fileName.length > 255) return false;
  if (block.mimeType !== undefined && (typeof block.mimeType !== "string" || block.mimeType.length > 200)) return false;
  if (block.sizeBytes !== undefined && (typeof block.sizeBytes !== "number" || !Number.isFinite(block.sizeBytes) || block.sizeBytes < 0 || block.sizeBytes > 5 * 1024 * 1024 * 1024)) return false;
  return true;
}

/** True when the image block carries a safe, renderable reference. */
export function isSafeImageBlock(block: DocumentBlock): boolean {
  if (!block.src) return false;
  if (!isSameOriginMediaSrc(block.src)) return false;
  if (!block.fileId) return false;
  const ext = extensionOf(block.fileName ?? "");
  if (ext && !IMAGE_EXTENSIONS.has(ext)) return false;
  if (block.mimeType !== undefined && !/^image\/(png|jpeg|jpg|gif|webp|avif|bmp|tiff)$/i.test(block.mimeType)) return false;
  if (block.sizeBytes !== undefined && (typeof block.sizeBytes !== "number" || !Number.isFinite(block.sizeBytes) || block.sizeBytes <= 0 || block.sizeBytes > 50 * 1024 * 1024)) return false;
  return true;
}
