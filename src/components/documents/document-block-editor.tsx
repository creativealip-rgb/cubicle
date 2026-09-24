"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  buildContractStarterBlocks,
  buildDocumentMediaBlock,
  buildProposalStarterBlocks,
  isSafeImageBlock,
  type DocumentBlock,
  type DocumentTableRow,
} from "@/lib/document-blocks";
import { uploadOneFile, MAX_UPLOAD_BYTES } from "@/lib/files-upload";
import { useT } from "@/lib/i18n-client";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { renderDocumentBlockHtml } from "@/lib/document-block-renderer";
import type { DocumentPlaceholderValues } from "@/lib/document-placeholders";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle,
  Copy,
  Download,
  Eye,
  FileText,
  GripVertical,
  Heading,
  Image as ImageIcon,
  LayoutTemplate,
  List,
  Loader2,
  Minus,
  Monitor,
  Paperclip,
  Plus,
  QrCode,
  Redo2,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sliders,
  Smartphone,
  Tablet,
  Table as TableIcon,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";

type LineItem = { description: string; quantity: number; unitPrice: number };

type Props = {
  kind: "proposal" | "contract";
  workspaceId: string;
  initialBlocks: DocumentBlock[];
  initialRevision?: number;
  backHref?: string;
  placeholderValues?: DocumentPlaceholderValues;
  saveBlocks: (blocks: DocumentBlock[], revision: number) => Promise<unknown>;
  onUpdateMeta?: (meta: Record<string, unknown>) => Promise<unknown>;
  documentMeta?: {
    id?: string;
    title: string;
    clientName: string | null;
    clientEmail: string | null;
    companyName?: string | null;
    validUntil: Date | string | null;
    contractNumber: string | null;
  };
  proposalMeta?: {
    id?: string;
    title: string;
    clientName: string | null;
    clientEmail: string | null;
    companyName?: string | null;
    validUntil: Date | string | null;
    status: string;
    downPaymentPercent?: number;
    taxRate?: number;
    currency?: string;
    lineItems?: LineItem[];
  };
};

type AddableBlock = "heading" | "text" | "placeholder" | "list" | "divider" | "table" | "image" | "attachment" | "signature";

type TFunc = (id: string, en: string) => string;

const proposalTokens = [
  "{{client_name}}",
  "{{client_email}}",
  "{{company_name}}",
  "{{workspace_name}}",
  "{{proposal_number}}",
  "{{valid_until}}",
  "{{today}}",
  "{{total_amount}}",
  "{{down_payment}}",
  "{{subtotal}}",
  "{{tax}}",
];

const contractTokens = [
  "{{client_name}}",
  "{{client_email}}",
  "{{company_name}}",
  "{{workspace_name}}",
  "{{workspace_address}}",
  "{{contract_number}}",
  "{{contract_date}}",
  "{{valid_until}}",
  "{{today}}",
];

function TableBlockEditor({ block, t, onChange }: { block: DocumentBlock; t: TFunc; onChange: (rows: DocumentTableRow[]) => void }) {
  const raw = block.rows ?? [];
  const rows: DocumentTableRow[] = raw.length ? raw : [["", ""], ["", ""]];
  const colCount = Math.max(1, ...rows.map((r) => r.length));

  function setCell(ri: number, ci: number, value: string) {
    onChange(rows.map((row, i) => row.map((cell, j) => (i === ri && j === ci ? value : cell))));
  }
  function addRow() {
    onChange([...rows, Array(colCount).fill("")]);
  }
  function addColumn() {
    onChange(rows.map((row) => [...row, ""]));
  }
  function removeRow(ri: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== ri));
  }
  function removeColumn(ci: number) {
    if (colCount <= 1) return;
    onChange(rows.map((row) => row.filter((_, j) => j !== ci)));
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/50 p-1">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? "bg-muted/40 font-semibold" : "hover:bg-muted/20"}>
                <td className="w-8 border border-border/60 bg-muted/30 p-1 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    disabled={rows.length <= 1}
                    className="text-muted-foreground/60 hover:text-destructive disabled:opacity-20 font-bold"
                    title={t("Hapus baris", "Remove row")}
                    aria-label={t("Hapus baris", "Remove row")}
                  >
                    ×
                  </button>
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-border/60 p-0.5">
                    <input
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className="w-full min-w-[4rem] border-0 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm outline-none focus:bg-background focus:ring-1 focus:ring-primary/40 rounded-sm"
                      placeholder={ri === 0 ? t(`Kolom ${ci + 1}`, `Column ${ci + 1}`) : ""}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="border border-border/60 bg-muted/30 p-1" />
              {Array.from({ length: colCount }).map((_, ci) => (
                <td key={ci} className="border border-border/60 bg-muted/30 p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeColumn(ci)}
                    disabled={colCount <= 1}
                    className="text-xs text-muted-foreground/60 hover:text-destructive disabled:opacity-20 font-bold"
                    title={t("Hapus kolom", "Remove column")}
                    aria-label={t("Hapus kolom", "Remove column")}
                  >
                    ×
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-medium" onClick={addRow}>
          + {t("Baris", "Row")}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-medium" onClick={addColumn}>
          + {t("Kolom", "Column")}
        </Button>
      </div>
    </div>
  );
}

export function DocumentBlockEditor({
  kind,
  workspaceId,
  initialBlocks,
  initialRevision = 1,
  backHref,
  placeholderValues = {},
  saveBlocks,
  onUpdateMeta,
  documentMeta,
  proposalMeta,
}: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const [pending, startTransition] = useTransition();
  useUnsavedChanges(dirty || saving);

  // Workflow Tabs: BUILD (Canvas) | SETTINGS (Document Metadata & Pricing) | PUBLISH (Share / Send)
  const [activeTab, setActiveTab] = useState<"build" | "settings" | "publish">("build");
  const [livePreviewMode, setLivePreviewMode] = useState(false);

  // Form Settings State (Live editable metadata & financial rules)
  const [metaState, setMetaState] = useState({
    title: proposalMeta?.title || documentMeta?.title || "",
    clientName: proposalMeta?.clientName || documentMeta?.clientName || "",
    clientEmail: proposalMeta?.clientEmail || documentMeta?.clientEmail || "",
    companyName: proposalMeta?.companyName || documentMeta?.companyName || "",
    contractNumber: documentMeta?.contractNumber || "",
    validUntil: proposalMeta?.validUntil
      ? new Date(proposalMeta.validUntil).toISOString().split("T")[0]
      : documentMeta?.validUntil
      ? new Date(documentMeta.validUntil).toISOString().split("T")[0]
      : "",
    taxRate: proposalMeta?.taxRate ?? 0,
    downPaymentPercent: proposalMeta?.downPaymentPercent ?? 0,
    lineItems: proposalMeta?.lineItems?.length
      ? proposalMeta.lineItems
      : [{ description: "Services Deliverable", quantity: 1, unitPrice: 0 }],
  });
  const [savingMeta, setSavingMeta] = useState(false);

  // Left & Right Panels
  const [elementsOpen, setElementsOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [elementSearch, setElementSearch] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(initialBlocks[0]?.id ?? null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeLeftTab, setActiveLeftTab] = useState<"elements" | "structure">("elements");

  // History Stack
  const [history, setHistory] = useState<DocumentBlock[][]>([initialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  // Upload & UI Modals
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(initialRevision);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const canvasScrollRef = useRef<HTMLElement>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { lang, t } = useT();

  const docTitle = metaState.title || (kind === "proposal" ? "Proposal" : "Contract");
  const docId = proposalMeta?.id || documentMeta?.id;
  const sharePath = kind === "proposal" ? `/proposal/${docId || ""}` : `/contract/${docId || ""}`;
  const fullShareUrl = docId ? `https://app.cubiqlo.com${sharePath}` : "";

  // Dynamic Price Calculations for Settings
  const lineItemsSubtotal = metaState.lineItems.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const lineItemsTax = lineItemsSubtotal * ((Number(metaState.taxRate) || 0) / 100);
  const lineItemsTotal = lineItemsSubtotal + lineItemsTax;
  const lineItemsDpAmount = lineItemsTotal * ((Number(metaState.downPaymentPercent) || 0) / 100);

  const blockLabel = (type: string) => {
    const labels: Record<string, [string, string]> = {
      heading: ["Heading", "Heading"],
      text: ["Teks & Paragraf", "Text & Paragraph"],
      placeholder: ["Smart Variable", "Smart Variable"],
      list: ["Bullet / Numbered List", "Bullet / Numbered List"],
      divider: ["Divider Line", "Divider Line"],
      table: ["Pricing / Data Table", "Pricing / Data Table"],
      image: ["Gambar / Logo", "Image / Logo"],
      attachment: ["Lampiran Dokumen", "File Attachment"],
      signature: ["Tanda Tangan Digital", "Digital Signature"],
    };
    const pair = labels[type];
    return pair ? t(pair[0], pair[1]) : `${t("Blok", "Block")} ${type}`;
  };

  const save = useCallback(async () => {
    if (!dirty || saving || stale) return;
    setSaving(true);
    try {
      const result = (await saveBlocks(blocks, revision.current)) as { contentRevision?: number } | null | undefined;
      if (result && typeof result.contentRevision === "number") {
        revision.current = result.contentRevision;
        setStale(false);
      }
      setDirty(false);
    } catch (error) {
      setStale(true);
      toast.error(error instanceof Error ? error.message : t("Gagal menyimpan", "Failed to save"));
    } finally {
      setSaving(false);
    }
  }, [blocks, dirty, saveBlocks, saving, stale, t]);

  useEffect(() => {
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save();
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [blocks, dirty, save]);

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!onUpdateMeta) return;
    setSavingMeta(true);
    try {
      const payload: Record<string, unknown> = {
        title: metaState.title,
        clientName: metaState.clientName,
        clientEmail: metaState.clientEmail || null,
        companyName: metaState.companyName || null,
        validUntil: metaState.validUntil || null,
      };
      if (kind === "proposal") {
        payload.taxRate = Number(metaState.taxRate) || 0;
        payload.downPaymentPercent = Number(metaState.downPaymentPercent) || 0;
        payload.lineItems = metaState.lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          amount: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        }));
      }
      if (kind === "contract" && metaState.contractNumber) {
        payload.contractNumber = metaState.contractNumber;
      }
      await onUpdateMeta(payload);
      toast.success(kind === "proposal" ? t("Pengaturan proposal berhasil disimpan", "Proposal settings saved") : t("Pengaturan kontrak berhasil disimpan", "Contract settings saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal menyimpan pengaturan", "Failed to save settings"));
    } finally {
      setSavingMeta(false);
    }
  }

  function update(id: string, content: string) {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, content } : block)));
    setDirty(true);
  }

  function updateBlock(id: string, patch: Partial<DocumentBlock>) {
    const next = blocks.map((block) => (block.id === id ? { ...block, ...patch } : block));
    setBlocks(next);
    recordHistory(next);
    setDirty(true);
  }

  function add(type: AddableBlock) {
    const block: DocumentBlock =
      type === "placeholder"
        ? { id: crypto.randomUUID(), type, content: "{{client_name}}" }
        : type === "heading"
        ? { id: crypto.randomUUID(), type, content: "", level: 2 }
        : type === "list"
        ? { id: crypto.randomUUID(), type, items: [""] }
        : type === "table"
        ? { id: crypto.randomUUID(), type, rows: [["Item Description", "Qty", "Price"], ["Core Deliverables", "1", "{{total_amount}}"]] }
        : type === "signature"
        ? { id: crypto.randomUUID(), type }
        : { id: crypto.randomUUID(), type, content: "" };

    const next = [...blocks, block];
    setBlocks(next);
    recordHistory(next);
    setDirty(true);
    setSelectedBlockId(block.id);
    toast.success(t(`Menambahkan ${blockLabel(type)}`, `Added ${blockLabel(type)}`));
  }

  function duplicateBlock(id: string) {
    const target = blocks.find((b) => b.id === id);
    if (!target) return;
    const clone: DocumentBlock = {
      ...target,
      id: crypto.randomUUID(),
    };
    const index = blocks.findIndex((b) => b.id === id);
    const next = [...blocks];
    next.splice(index + 1, 0, clone);
    setBlocks(next);
    recordHistory(next);
    setDirty(true);
    setSelectedBlockId(clone.id);
    toast.success(t("Blok berhasil diduplikasi", "Block duplicated"));
  }

  function applyStarterTemplate() {
    const starter = kind === "contract" ? buildContractStarterBlocks() : buildProposalStarterBlocks();
    recordHistory(starter);
    setBlocks(starter);
    setDirty(true);
    setSelectedBlockId(starter[0]?.id ?? null);
    setShowTemplateConfirm(false);
    setTemplateDialogOpen(false);
    toast.success(t("Template profesional berhasil dimuat", "Professional template applied"));
  }

  function insertPlaceholder(token: string) {
    const target = blocks.find(
      (block) => block.id === selectedBlockId && (block.type === "text" || block.type === "placeholder" || block.type === "heading")
    );
    if (target) {
      updateBlock(target.id, { content: `${target.content ?? ""}${token}` });
      toast.success(t(`Menyisipkan ${token}`, `Inserted ${token}`));
    } else {
      const block: DocumentBlock = { id: crypto.randomUUID(), type: "text", content: token };
      const next = [...blocks, block];
      setBlocks(next);
      recordHistory(next);
      setDirty(true);
      setSelectedBlockId(block.id);
      toast.success(t(`Menambahkan blok baru dengan ${token}`, `Added new block with ${token}`));
    }
  }

  function move(id: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  function remove(id: string) {
    setBlocks((current) => current.filter((item) => item.id !== id));
    setDirty(true);
    if (selectedBlockId === id) setSelectedBlockId(null);
  }

  async function handleMediaUpload(kind: "image" | "attachment", file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t("Berkas harus di bawah 25MB", "File must be under 25MB"));
      return;
    }
    const blockId = crypto.randomUUID();
    setBlocks((current) => [...current, { id: blockId, type: kind }]);
    setDirty(false);
    setUploadingId(blockId);
    try {
      const record = await uploadOneFile(
        file,
        { workspaceId, visibility: "internal", fileType: "working_file" },
        (pct) => setUploadProgress((p) => ({ ...p, [blockId]: pct })),
        lang
      );
      const mediaBlock = buildDocumentMediaBlock(kind, record);
      setBlocks((current) => current.map((block) => (block.id === blockId ? { ...mediaBlock, id: blockId } : block)));
      setDirty(true);
      toast.success(kind === "image" ? t("Gambar diunggah", "Image uploaded") : t("Lampiran diunggah", "Attachment uploaded"));
    } catch (err: unknown) {
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setDirty(true);
      if (err instanceof Error && err.message === "MAX_SIZE") {
        toast.error(t("Berkas harus di bawah 25MB", "File must be under 25MB"));
      } else {
        toast.error(err instanceof Error ? err.message : t("Gagal mengunggah", "Upload failed"));
      }
    } finally {
      setUploadingId(null);
      setUploadProgress((p) => {
        const next = { ...p };
        delete next[blockId];
        return next;
      });
      if (kind === "image" && imageInputRef.current) imageInputRef.current.value = "";
      if (kind === "attachment" && attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  const uploading = uploadingId !== null;

  function undo() {
    if (historyIndex <= 0) return;
    const next = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    setBlocks(next);
    setDirty(true);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    setBlocks(next);
    setDirty(true);
  }

  function recordHistory(next: DocumentBlock[]) {
    setHistory((current) => [...current.slice(0, historyIndex + 1), next].slice(-30));
    setHistoryIndex((current) => Math.min(current + 1, 29));
  }

  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const from = blocks.findIndex((block) => block.id === draggedId);
    const to = blocks.findIndex((block) => block.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
    recordHistory(next);
    setDirty(true);
    setDraggedBlockId(null);
  }

  function selectBlock(id: string) {
    setSelectedBlockId(id);
    const node = blockRefs.current[id];
    const scroller = canvasScrollRef.current;
    if (node && scroller) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  const availableTokens = kind === "contract" ? contractTokens : proposalTokens;

  const catalogItems: { type: AddableBlock; label: string; desc: string; icon: typeof Type; category: "basic" | "media" | "special" }[] = [
    { type: "heading", label: "Heading", desc: "Section title (H1, H2, H3)", icon: Heading, category: "basic" },
    { type: "text", label: "Paragraph / Text", desc: "Standard text content with placeholders", icon: Type, category: "basic" },
    { type: "list", label: "Bullet / Numbered List", desc: "Itemized scope or deliverables", icon: List, category: "basic" },
    { type: "table", label: "Pricing & Data Table", desc: "Structured fee breakdown table", icon: TableIcon, category: "basic" },
    { type: "divider", label: "Divider Line", desc: "Horizontal separation line", icon: Minus, category: "basic" },
    { type: "image", label: "Image / Asset", desc: "Mockups, logos, diagrams", icon: ImageIcon, category: "media" },
    { type: "attachment", label: "File Attachment", desc: "Downloadable PDF / brief files", icon: Paperclip, category: "media" },
    { type: "placeholder", label: "Smart Variable Block", desc: "Dynamic client / project token", icon: ShieldCheck, category: "special" },
    { type: "signature", label: "Signature Pad", desc: "Client digital sign-off area", icon: ShieldCheck, category: "special" },
  ];

  const filteredCatalog = catalogItems.filter(
    (item) =>
      item.label.toLowerCase().includes(elementSearch.toLowerCase()) ||
      item.desc.toLowerCase().includes(elementSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-muted/20">
      {/* ── TOPBAR HEADER (Forms-style 3-Tabs + Device Switcher + Actions) ── */}
      <header className="h-14 border-b border-border/70 bg-background/95 backdrop-blur px-3 sm:px-5 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {backHref && (
            <Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t("Kembali", "Back")}>
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[150px] sm:max-w-xs">{docTitle}</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {stale
                ? t("Dokumen berubah di tempat lain", "Document changed elsewhere")
                : saving || pending
                ? t("Menyimpan perubahan...", "Saving changes...")
                : dirty
                ? t("Perubahan belum tersimpan", "Unsaved changes")
                : t("Semua perubahan tersimpan", "All changes saved")}
            </p>
          </div>
        </div>

        {/* 3 Main Workflow Tabs (BUILD / SETTINGS / PUBLISH) */}
        <div className="flex items-center gap-1 bg-muted/70 p-0.5 sm:p-1 rounded-xl border border-border/70">
          <button
            type="button"
            onClick={() => setActiveTab("build")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === "build" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-primary" />
            <span>BUILD</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === "settings" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
            title={t("Pengaturan", "Settings")}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>SETTINGS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("publish")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === "publish" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>PUBLISH</span>
          </button>
        </div>

        {/* Actions Right */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Live Preview Switcher */}
          <button
            type="button"
            onClick={() => setLivePreviewMode(!livePreviewMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
              livePreviewMode
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/70"
            }`}
            title={t("Pratinjau", "Preview")}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("Pratinjau", "Preview")}</span>
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5 hidden md:inline-flex"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>Templates</span>
          </Button>

          {activeTab === "build" && !livePreviewMode && (
            <>
              <Button
                type="button"
                variant={elementsOpen ? "default" : "outline"}
                size="sm"
                onClick={() => setElementsOpen(!elementsOpen)}
                className="h-8 gap-1 text-xs font-semibold hidden lg:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Elements</span>
              </Button>
              <Button
                type="button"
                variant={propertiesOpen ? "default" : "outline"}
                size="sm"
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                className="h-8 gap-1 text-xs font-semibold hidden xl:inline-flex"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Properties</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={() => startTransition(() => { void save(); })}
            disabled={!dirty || saving || pending || stale}
            className="h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground shadow-xs gap-1.5"
          >
            {saving || pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>{t("Simpan", "Save")}</span>
          </Button>
        </div>
      </header>

      {/* ── TAB 1: BUILD (3-Panel WYSIWYG Builder) ── */}
      {activeTab === "build" && (
        <div className="flex flex-1 min-h-0 relative overflow-hidden">
          {/* PANEL KIRI: Element Catalog & Structure */}
          {!livePreviewMode && elementsOpen && (
            <aside className="w-64 sm:w-72 border-r border-border/70 bg-background flex flex-col shrink-0 h-full overflow-hidden shadow-xs z-10 animate-in slide-in-from-left duration-200">
              <div className="p-2.5 border-b border-border/60 flex flex-col gap-2 shrink-0 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveLeftTab("elements")}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        activeLeftTab === "elements" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                      }`}
                    >
                      Elements
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLeftTab("structure")}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        activeLeftTab === "structure" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                      }`}
                    >
                      Structure ({blocks.length})
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 lg:hidden" onClick={() => setElementsOpen(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {activeLeftTab === "elements" && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t("Cari elemen...", "Search elements...")}
                      value={elementSearch}
                      onChange={(e) => setElementSearch(e.target.value)}
                      className="h-8 pl-8 pr-2.5 text-xs bg-muted/40 border-border/60 focus:bg-background"
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {activeLeftTab === "elements" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredCatalog.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => {
                              if (item.type === "image") imageInputRef.current?.click();
                              else if (item.type === "attachment") attachmentInputRef.current?.click();
                              else add(item.type);
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-primary/5 text-left transition-all group bg-background shadow-2xs"
                          >
                            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground group-hover:text-primary leading-tight">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {t("Urutan Blok Dokumen", "Document Block Order")}
                    </p>
                    {blocks.map((block, index) => (
                      <button
                        key={block.id}
                        type="button"
                        draggable
                        onDragStart={() => setDraggedBlockId(block.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => draggedBlockId && reorder(draggedBlockId, block.id)}
                        onDragEnd={() => setDraggedBlockId(null)}
                        onClick={() => selectBlock(block.id)}
                        title={t("Seret untuk mengurutkan", "Drag to reorder")}
                        className={`flex w-full cursor-grab items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                          selectedBlockId === block.id
                            ? "bg-primary/10 font-bold text-primary border border-primary/30"
                            : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                        <span className="w-4 text-[10px] text-muted-foreground/70">{index + 1}</span>
                        <span className="truncate flex-1">{blockLabel(block.type)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* KANVAS TENGAH: WYSIWYG Document Paper */}
          <main ref={canvasScrollRef} className="flex-1 flex flex-col h-full overflow-y-auto bg-muted/30 p-4 sm:p-8">
            {/* Device Switcher & Undo/Redo Floating Top Bar */}
            <div className="mx-auto mb-4 flex items-center justify-between gap-3 max-w-3xl w-full">
              <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background/90 backdrop-blur p-1 shadow-2xs">
                {(
                  [
                    ["desktop", Monitor],
                    ["tablet", Tablet],
                    ["mobile", Smartphone],
                  ] as const
                ).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDevice(name)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      device === name ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="capitalize hidden sm:inline">{name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background/90 backdrop-blur p-1 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  title={t("Urungkan", "Undo")}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  title={t("Ulangi", "Redo")}
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Document Paper Canvas */}
            <div
              className={`mx-auto w-full transition-all duration-300 ${
                device === "mobile" ? "max-w-[400px]" : device === "tablet" ? "max-w-[768px]" : "max-w-3xl"
              }`}
            >
              {livePreviewMode ? (
                <div className="rounded-2xl border border-border/80 bg-background p-6 sm:p-10 shadow-sm min-h-[700px]">
                  <div className="mb-4 pb-3 border-b border-border/60 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase text-primary border-primary/30">
                      Live Document Preview
                    </Badge>
                    <span className="text-xs text-muted-foreground">{blocks.length} blocks rendered</span>
                  </div>
                  <div className="space-y-4 break-words [overflow-wrap:anywhere]">
                    {blocks.map((block) => (
                      <div key={block.id} className="text-sm text-foreground">
                        {renderDocumentBlockHtml(block, placeholderValues)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/80 bg-background p-6 sm:p-10 shadow-sm min-h-[750px] space-y-3">
                  {blocks.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm font-semibold text-muted-foreground">Dokumen masih kosong</p>
                      <Button size="sm" variant="outline" onClick={applyStarterTemplate} className="gap-1.5 text-xs font-semibold">
                        <LayoutTemplate className="h-3.5 w-3.5" />
                        <span>Gunakan Starter Template</span>
                      </Button>
                    </div>
                  ) : (
                    blocks.map((block, index) => {
                      const isSelected = selectedBlockId === block.id;
                      return (
                        <div
                          key={block.id}
                          ref={(node) => {
                            blockRefs.current[block.id] = node;
                          }}
                          onClick={() => setSelectedBlockId(block.id)}
                          className={`group relative rounded-xl border p-2.5 sm:p-3 transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
                              : "border-transparent hover:border-border/80 hover:bg-muted/10"
                          }`}
                        >
                          {/* Block Quick Floating Toolbar */}
                          <div
                            className={`absolute right-2 -top-3 z-20 flex items-center gap-0.5 rounded-lg border border-border/80 bg-background px-1 py-0.5 shadow-sm transition-opacity ${
                              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                move(block.id, -1);
                              }}
                              disabled={index === 0}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                              title={t("Naik", "Move up")}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                move(block.id, 1);
                              }}
                              disabled={index === blocks.length - 1}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                              title={t("Turun", "Move down")}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateBlock(block.id);
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-primary"
                              title={t("Duplikasi", "Duplicate")}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(block.id);
                              }}
                              className="p-1 rounded text-destructive hover:bg-destructive/10"
                              title={t("Hapus", "Delete")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Block In-Canvas Editors */}
                          {block.type === "heading" ? (
                            <Input
                              value={block.content ?? ""}
                              onChange={(e) => update(block.id, e.target.value)}
                              className={`border-none bg-transparent font-bold tracking-tight focus:bg-background focus:ring-1 focus:ring-primary/40 ${
                                block.level === 1
                                  ? "text-2xl sm:text-3xl"
                                  : block.level === 3
                                  ? "text-base sm:text-lg"
                                  : "text-lg sm:text-xl"
                              } ${block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left"}`}
                              placeholder={t("Judul bagian...", "Section heading...")}
                            />
                          ) : block.type === "text" || block.type === "placeholder" ? (
                            <Textarea
                              className={`w-full resize-y border-none bg-transparent text-xs sm:text-sm leading-relaxed focus:bg-background focus:ring-1 focus:ring-primary/40 ${
                                block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left"
                              }`}
                              value={block.content ?? ""}
                              onChange={(e) => update(block.id, e.target.value)}
                              rows={Math.max(2, (block.content || "").split("\n").length)}
                              placeholder={block.type === "placeholder" ? "{{client_name}}" : t("Tulis isi dokumen...", "Write document content...")}
                            />
                          ) : block.type === "list" ? (
                            <div className="space-y-1">
                              <Textarea
                                value={(block.items ?? []).join("\n")}
                                onChange={(e) => {
                                  const items = e.target.value.split("\n");
                                  setBlocks((current) => current.map((item) => (item.id === block.id ? { ...item, items } : item)));
                                  setDirty(true);
                                }}
                                rows={Math.max(3, (block.items || []).length)}
                                className="border-none bg-transparent text-xs sm:text-sm leading-relaxed focus:bg-background focus:ring-1 focus:ring-primary/40"
                                placeholder={t("Satu item per baris...", "One item per line...")}
                              />
                            </div>
                          ) : block.type === "table" ? (
                            <TableBlockEditor block={block} t={t} onChange={(rows) => updateBlock(block.id, { rows })} />
                          ) : block.type === "divider" ? (
                            <div className="py-2">
                              <hr className="border-border/80" />
                            </div>
                          ) : block.type === "image" ? (
                            <div className="space-y-2">
                              {uploadingId === block.id ? (
                                <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-6 text-sm text-primary justify-center font-medium">
                                  <Loader2 className="h-4 w-4 animate-spin" /> {t("Mengunggah gambar...", "Uploading image...")}{" "}
                                  {uploadProgress[block.id] ?? 0}%
                                </div>
                              ) : isSafeImageBlock(block) ? (
                                <figure className="my-1">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={block.src}
                                    alt={block.fileName ?? t("Gambar", "Image")}
                                    className="max-h-80 rounded-xl border border-border/80 shadow-2xs mx-auto"
                                  />
                                  <figcaption className="mt-1 text-center text-[11px] text-muted-foreground">{block.fileName}</figcaption>
                                </figure>
                              ) : (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
                                  {t("Gambar tidak valid.", "Invalid image.")}
                                </div>
                              )}
                            </div>
                          ) : block.type === "attachment" ? (
                            <div className="space-y-2">
                              {uploadingId === block.id ? (
                                <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-4 text-xs text-primary justify-center font-medium">
                                  <Loader2 className="h-4 w-4 animate-spin" /> {t("Mengunggah lampiran...", "Uploading attachment...")}{" "}
                                  {uploadProgress[block.id] ?? 0}%
                                </div>
                              ) : block.fileId ? (
                                <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs sm:text-sm">
                                  <Paperclip className="h-4 w-4 text-primary" />
                                  <span className="flex-1 truncate font-medium">{block.fileName ?? t("Lampiran", "Attachment")}</span>
                                  {block.sizeBytes ? (
                                    <span className="text-xs text-muted-foreground">{(block.sizeBytes / 1024).toFixed(0)} KB</span>
                                  ) : null}
                                  <a
                                    href={`/api/files/${block.fileId}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-primary hover:underline"
                                  >
                                    {t("Unduh", "Download")}
                                  </a>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                  {t("Lampiran tidak valid.", "Invalid attachment.")}
                                </div>
                              )}
                            </div>
                          ) : block.type === "signature" ? (
                            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                              <ShieldCheck className="h-6 w-6 text-primary/60" />
                              <span className="font-semibold text-foreground">{t("Area Tanda Tangan Digital Klien", "Client Digital Signature Area")}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {t("Klien akan menandatangani secara digital saat membuka link publik dokumen ini.", "Client will sign digitally upon opening public link.")}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">{blockLabel(block.type)}</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </main>

          {/* PANEL KANAN: Block Properties & Smart Variables */}
          {!livePreviewMode && propertiesOpen && (
            <aside className="w-64 sm:w-72 border-l border-border/70 bg-background flex flex-col shrink-0 h-full overflow-hidden shadow-xs z-10 animate-in slide-in-from-right duration-200">
              <div className="p-3 border-b border-border/60 flex items-center justify-between shrink-0 bg-muted/10">
                <div className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Properti Blok", "Block Properties")}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 xl:hidden" onClick={() => setPropertiesOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {selectedBlockId ? (
                  (() => {
                    const sel = blocks.find((b) => b.id === selectedBlockId);
                    if (!sel) return null;
                    const isTextLike = sel.type === "heading" || sel.type === "text" || sel.type === "placeholder";
                    return (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                          <p className="text-xs font-bold text-foreground">{blockLabel(sel.type)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">ID: {sel.id.slice(0, 8)}...</p>

                          {sel.type === "heading" && (
                            <div className="mt-3 space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">{t("Tingkat Heading", "Heading Level")}</label>
                              <div className="grid grid-cols-3 gap-1">
                                {([1, 2, 3] as const).map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => updateBlock(sel.id, { level: lvl })}
                                    className={`py-1 text-xs font-bold rounded-md border transition-all ${
                                      sel.level === lvl
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground hover:bg-muted/50 border-border/70"
                                    }`}
                                  >
                                    H{lvl}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {sel.type === "list" && (
                            <div className="mt-3">
                              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(sel.ordered)}
                                  onChange={(e) => updateBlock(sel.id, { ordered: e.target.checked })}
                                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span>{t("List Bernomor (1, 2, 3)", "Numbered List (1, 2, 3)")}</span>
                              </label>
                            </div>
                          )}

                          {isTextLike && (
                            <div className="mt-3 space-y-1">
                              <label className="text-[11px] font-semibold text-muted-foreground">{t("Perataan Teks", "Text Alignment")}</label>
                              <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-background p-0.5">
                                {(
                                  [
                                    ["left", AlignLeft],
                                    ["center", AlignCenter],
                                    ["right", AlignRight],
                                  ] as const
                                ).map(([align, Icon]) => (
                                  <button
                                    key={align}
                                    type="button"
                                    onClick={() => updateBlock(sel.id, { align })}
                                    className={`flex items-center justify-center py-1 rounded text-xs transition-colors ${
                                      sel.align === align ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-muted/50"
                                    }`}
                                    title={align}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-4">
                    {t("Pilih blok pada kanvas untuk melihat propertinya.", "Select a block on canvas to view its properties.")}
                  </div>
                )}

                {/* Smart Variables & Dynamic Placeholders */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">{t("Smart Variables", "Smart Variables")}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t(
                      "Klik token di bawah untuk langsung menyisipkan nilai dinamis ke dalam blok teks yang dipilih:",
                      "Click a token below to insert dynamic values into the selected text block:"
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {availableTokens.map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertPlaceholder(token)}
                        className="rounded-lg border border-border/80 bg-background px-2 py-1 text-[11px] font-mono font-medium text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-2xs"
                        title={t("Sisipkan ke blok terpilih", "Insert into selected block")}
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Hidden File Inputs for Local Image & Attachment Upload */}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload("image", e.target.files?.[0])} />
          <input
            ref={attachmentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
            className="hidden"
            onChange={(e) => handleMediaUpload("attachment", e.target.files?.[0])}
          />
        </div>
      )}

      {/* ── TAB 2: SETTINGS (Document Metadata & Pricing Rules) ── */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8">
          <form onSubmit={handleSaveSettings} className="mx-auto max-w-3xl space-y-6">
            {/* Metadata Card */}
            <div className="rounded-2xl border border-border/80 bg-background p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {kind === "proposal" ? t("Pengaturan & Metadata Proposal", "Proposal Settings & Metadata") : t("Pengaturan & Metadata Kontrak", "Contract Settings & Metadata")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("Kelola informasi klien, judul, dan masa berlaku dokumen ini.", "Manage client info, title, and validity for this document.")}
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold uppercase text-[11px]">
                  {proposalMeta?.status || "Draft"}
                </Badge>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("Judul Dokumen", "Document Title")}</Label>
                  <Input
                    value={metaState.title}
                    onChange={(e) => setMetaState((v) => ({ ...v, title: e.target.value }))}
                    placeholder="e.g. Website Revamp & Maintenance"
                    required
                    className="text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{t("Nama Klien", "Client Name")}</Label>
                    <Input
                      value={metaState.clientName}
                      onChange={(e) => setMetaState((v) => ({ ...v, clientName: e.target.value }))}
                      placeholder="e.g. John Doe"
                      required
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{t("Email Klien", "Client Email")}</Label>
                    <Input
                      type="email"
                      value={metaState.clientEmail}
                      onChange={(e) => setMetaState((v) => ({ ...v, clientEmail: e.target.value }))}
                      placeholder="e.g. client@example.com"
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{t("Nama Perusahaan", "Company Name")}</Label>
                    <Input
                      value={metaState.companyName}
                      onChange={(e) => setMetaState((v) => ({ ...v, companyName: e.target.value }))}
                      placeholder="e.g. Acme Corp"
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{t("Masa Berlaku (Valid Until)", "Valid Until")}</Label>
                    <Input
                      type="date"
                      value={metaState.validUntil}
                      onChange={(e) => setMetaState((v) => ({ ...v, validUntil: e.target.value }))}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {kind === "contract" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{t("Nomor Kontrak", "Contract Number")}</Label>
                    <Input
                      value={metaState.contractNumber}
                      onChange={(e) => setMetaState((v) => ({ ...v, contractNumber: e.target.value }))}
                      placeholder="CONT-2026-0001"
                      className="text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Proposal Financial / Line Items Card */}
            {kind === "proposal" && (
              <div className="rounded-2xl border border-border/80 bg-background p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{t("Rincian Harga & Pembayaran", "Pricing & Payment Terms")}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("Atur rincian item, kuantitas, pajak, dan ketentuan Down Payment (DP).", "Set line items, quantities, taxes, and down payment terms.")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{t("Pajak / Tax (%)", "Tax Rate (%)")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={metaState.taxRate}
                      onChange={(e) => setMetaState((v) => ({ ...v, taxRate: Number(e.target.value) || 0 }))}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{t("Down Payment / DP (%)", "Down Payment (%)")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={metaState.downPaymentPercent}
                      onChange={(e) => setMetaState((v) => ({ ...v, downPaymentPercent: Number(e.target.value) || 0 }))}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Daftar Item Proposal", "Proposal Line Items")}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMetaState((v) => ({
                          ...v,
                          lineItems: [...v.lineItems, { description: "", quantity: 1, unitPrice: 0 }],
                        }))
                      }
                      className="h-7 text-xs font-semibold gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t("Tambah Baris", "Add Row")}</span>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {metaState.lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_140px_36px] gap-2 items-center bg-muted/20 p-2 rounded-xl border border-border/60">
                        <Input
                          placeholder={t("Deskripsi item / deliverable...", "Item description / deliverable...")}
                          value={item.description}
                          onChange={(e) => {
                            const desc = e.target.value;
                            setMetaState((v) => ({
                              ...v,
                              lineItems: v.lineItems.map((li, i) => (i === index ? { ...li, description: desc } : li)),
                            }));
                          }}
                          className="h-8 text-xs bg-background"
                          required
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value) || 0;
                            setMetaState((v) => ({
                              ...v,
                              lineItems: v.lineItems.map((li, i) => (i === index ? { ...li, quantity: qty } : li)),
                            }));
                          }}
                          className="h-8 text-xs bg-background"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Harga Satuan"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const price = Number(e.target.value) || 0;
                            setMetaState((v) => ({
                              ...v,
                              lineItems: v.lineItems.map((li, i) => (i === index ? { ...li, unitPrice: price } : li)),
                            }));
                          }}
                          className="h-8 text-xs bg-background"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={metaState.lineItems.length <= 1}
                          onClick={() =>
                            setMetaState((v) => ({
                              ...v,
                              lineItems: v.lineItems.filter((_, i) => i !== index),
                            }))
                          }
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Calculations Summary Box */}
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1.5 text-xs text-right mt-3">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("Subtotal", "Subtotal")}</span>
                      <span className="font-mono font-medium">{lineItemsSubtotal.toLocaleString("id-ID")}</span>
                    </div>
                    {metaState.taxRate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t(`Pajak (${metaState.taxRate}%)`, `Tax (${metaState.taxRate}%)`)}</span>
                        <span className="font-mono font-medium">{lineItemsTax.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-foreground border-t border-border/60 pt-1.5">
                      <span>{t("Total Proposal", "Total Proposal")}</span>
                      <span className="font-mono text-primary font-bold">{lineItemsTotal.toLocaleString("id-ID")}</span>
                    </div>
                    {metaState.downPaymentPercent > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                        <span>{t(`Down Payment (${metaState.downPaymentPercent}%)`, `Down Payment (${metaState.downPaymentPercent}%)`)}</span>
                        <span className="font-mono font-bold text-foreground">{lineItemsDpAmount.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Settings Button */}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingMeta} className="gap-1.5 text-xs font-semibold px-5">
                {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{t("Simpan Pengaturan", "Save Settings")}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 3: PUBLISH (Sharing, WhatsApp, QR, & PDF) ── */}
      {activeTab === "publish" && (
        <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-2xl border border-border/80 bg-background p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {kind === "proposal" ? t("Publikasikan & Kirim Proposal", "Publish & Send Proposal") : t("Kirim Kontrak untuk Tanda Tangan", "Send Contract for Signature")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("Bagikan link resmi kepada klien untuk ditinjau dan ditandatangani secara digital.", "Share universal link with your client for review and digital signature.")}
                </p>
              </div>

              {/* Direct Link Share Card */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <label className="text-xs font-bold text-foreground">{t("Link Publik Dokumen", "Public Document Link")}</label>
                <div className="flex items-center gap-2">
                  <Input value={fullShareUrl || "https://app.cubiqlo.com/..."} readOnly className="font-mono text-xs bg-background" />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (fullShareUrl) {
                        navigator.clipboard.writeText(fullShareUrl);
                        toast.success(t("Link berhasil disalin ke clipboard!", "Link copied to clipboard!"));
                      }
                    }}
                    className="shrink-0 gap-1.5 text-xs font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{t("Salin", "Copy")}</span>
                  </Button>
                </div>
              </div>

              {/* Action Buttons Grid: WhatsApp Web, QR Code, PDF Download */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1.5 rounded-xl border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Halo, berikut tautan resmi dokumen "${docTitle}" untuk Anda tinjau dan tanda tangani:\n${fullShareUrl}`
                    );
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                >
                  <Send className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">WhatsApp Share</span>
                  <span className="text-[10px] text-muted-foreground">Kirim via WA Chat</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1.5 rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                  onClick={() => setQrModalOpen(true)}
                >
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">QR Code</span>
                  <span className="text-[10px] text-muted-foreground">Scan via Smartphone</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1.5 rounded-xl border-border/80 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-center"
                  onClick={() => {
                    window.open(`${sharePath}`, "_blank");
                  }}
                >
                  <Download className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-foreground">Open / Print PDF</span>
                  <span className="text-[10px] text-muted-foreground">Buka halaman cetak</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: STARTER TEMPLATES SELECTOR ── */}
      {templateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-background p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">{t("Pilih Starter Template", "Select Starter Template")}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTemplateDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "Gunakan struktur dokumen profesional standar yang sudah dilengkapi dengan pasal-pasal dan smart variable siap pakai.",
                "Apply a standard professional document structure equipped with ready-to-use clauses and smart variables."
              )}
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (blocks.length > 0) setShowTemplateConfirm(true);
                  else applyStarterTemplate();
                }}
                className="w-full p-3.5 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-primary group-hover:underline">
                    {kind === "proposal" ? "Standard Web & Tech Proposal" : "Standard Master Service Agreement (MSA)"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {kind === "proposal"
                      ? "Executive summary, scope, investment table, milestones, & terms."
                      : "Parties, services, pricing, confidentiality, IP, & signature."}
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM TEMPLATE OVERWRITE ── */}
      {showTemplateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-sm rounded-2xl border border-border/80 bg-background p-6 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-foreground">{t("Ganti dengan template?", "Replace with template?")}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "Dokumen ini sudah berisi konten. Semua blok saat ini akan digantikan dengan template baru. Lanjutkan?",
                "This document already has content. All current blocks will be replaced with the new template. Continue?"
              )}
            </p>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 text-xs" onClick={() => setShowTemplateConfirm(false)}>
                {t("Batal", "Cancel")}
              </Button>
              <Button type="button" className="flex-1 text-xs font-semibold bg-primary text-primary-foreground" onClick={applyStarterTemplate}>
                {t("Ganti Saja", "Replace Anyway")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: QR CODE ── */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setQrModalOpen(false)}>
          <div className="max-w-sm w-full rounded-2xl border border-border/80 bg-background p-6 shadow-xl text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">QR Code Dokumen</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQrModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 bg-white rounded-xl border inline-block mx-auto shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fullShareUrl)}`}
                alt="QR Code"
                className="h-44 w-44 mx-auto"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Scan untuk membuka dokumen ini langsung di smartphone klien.</p>
          </div>
        </div>
      )}
    </div>
  );
}
