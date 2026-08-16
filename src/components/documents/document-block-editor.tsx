"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  buildDocumentMediaBlock,
  buildProposalStarterBlocks,
  isSafeImageBlock,
  type DocumentBlock,
  type DocumentTableRow,
} from "@/lib/document-blocks";
import { uploadOneFile, MAX_UPLOAD_BYTES } from "@/lib/files-upload";
import { useT } from "@/lib/i18n-client";
import { renderDocumentBlockHtml } from "@/lib/document-block-renderer";
import type { DocumentPlaceholderValues } from "@/lib/document-placeholders";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowUp, Eye, GripVertical, Loader2, Monitor, Paperclip, Redo2, Smartphone, Tablet, Trash2, Undo2, Upload, X } from "lucide-react";

type Props = {
  kind: "proposal" | "contract";
  workspaceId: string;
  initialBlocks: DocumentBlock[];
  initialRevision?: number;
  backHref?: string;
  placeholderValues?: DocumentPlaceholderValues;
  saveBlocks: (blocks: DocumentBlock[], revision: number) => Promise<unknown>;
};

type AddableBlock = "text" | "heading" | "placeholder" | "list" | "divider" | "table" | "image" | "attachment";

type TFunc = (id: string, en: string) => string;

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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td className="w-8 border border-slate-200 bg-slate-50 p-0.5 align-middle text-center">
                  <button type="button" onClick={() => removeRow(ri)} disabled={rows.length <= 1} className="text-slate-400 hover:text-red-600 disabled:opacity-30" title={t("Hapus baris", "Remove row")} aria-label={t("Hapus baris", "Remove row")}>×</button>
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-slate-200 p-0.5">
                    <input
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className="w-full min-w-[3.5rem] border-0 bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-primary/40"
                      placeholder={ri === 0 ? t("Kolom", "Column") : ""}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="border border-slate-200 bg-slate-50 p-0.5" />
              {Array.from({ length: colCount }).map((_, ci) => (
                <td key={ci} className="border border-slate-200 bg-slate-50 p-0.5 text-center">
                  <button type="button" onClick={() => removeColumn(ci)} disabled={colCount <= 1} className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-30" title={t("Hapus kolom", "Remove column")} aria-label={t("Hapus kolom", "Remove column")}>×</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow}>+ {t("Baris", "Row")}</Button>
        <Button type="button" size="sm" variant="outline" onClick={addColumn}>+ {t("Kolom", "Column")}</Button>
      </div>
    </div>
  );
}

export function DocumentBlockEditor({ kind, workspaceId, initialBlocks, initialRevision = 1, backHref, placeholderValues = {}, saveBlocks }: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(initialBlocks[0]?.id ?? null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [history, setHistory] = useState<DocumentBlock[][]>([initialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(initialRevision);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const canvasScrollRef = useRef<HTMLElement>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { lang, t } = useT();

  const blockLabel = (type: string) => {
    const labels: Record<string, [string, string]> = {
      heading: ["Heading", "Heading"],
      text: ["Teks", "Text"],
      placeholder: ["Placeholder", "Placeholder"],
      list: ["Daftar", "List"],
      divider: ["Pembatas", "Divider"],
      table: ["Tabel", "Table"],
      image: ["Gambar", "Image"],
      attachment: ["Lampiran", "Attachment"],
      signature: ["Tanda tangan", "Signature"],
    };
    const pair = labels[type];
    return pair ? t(pair[0], pair[1]) : `${t("Blok", "Block")} ${type}`;
  };

  const save = useCallback(async () => {
    if (!dirty || saving || stale) return;
    setSaving(true);
    try {
      const result = await saveBlocks(blocks, revision.current) as { contentRevision?: number } | null | undefined;
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
    timer.current = setTimeout(() => { void save(); }, 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [blocks, dirty, save]);

  function update(id: string, content: string) {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, content } : block));
    setDirty(true);
  }

  function updateBlock(id: string, patch: Partial<DocumentBlock>) {
    const next = blocks.map((block) => block.id === id ? { ...block, ...patch } : block);
    setBlocks(next);
    recordHistory(next);
    setDirty(true);
  }

  function add(type: AddableBlock) {
    const block: DocumentBlock = type === "placeholder"
      ? { id: crypto.randomUUID(), type, content: "{{client_name}}" }
      : type === "heading"
        ? { id: crypto.randomUUID(), type, content: "", level: 2 }
        : type === "list"
          ? { id: crypto.randomUUID(), type, items: [""] }
          : type === "table"
            ? { id: crypto.randomUUID(), type, rows: [["", ""], ["", ""]] }
            : { id: crypto.randomUUID(), type, content: "" };
    setBlocks((current) => [...current, block]);
    setDirty(true);
  }

  function hasNonDefaultContent() {
    const nonEmpty = blocks.some((block) => {
      if (block.type === "text" && (block.content ?? "").trim() !== "") return true;
      if (block.type === "heading" && (block.content ?? "").trim() !== "") return true;
      if (block.type === "list" && (block.items ?? []).some((item) => item.trim() !== "")) return true;
      if (block.type === "table" && (block.rows ?? []).some((row) => row.some((cell) => cell.trim() !== ""))) return true;
      if (block.type === "placeholder" && (block.content ?? "").trim() !== "") return true;
      if (block.type === "image" || block.type === "attachment") return true;
      return false;
    });
    return nonEmpty;
  }

  function handleStartFromTemplate() {
    if (hasNonDefaultContent()) {
      setShowTemplateConfirm(true);
      return;
    }
    applyStarterTemplate();
  }

  function applyStarterTemplate() {
    const starter = buildProposalStarterBlocks();
    recordHistory(starter);
    setBlocks(starter);
    setDirty(true);
    setSelectedBlockId(starter[0]?.id ?? null);
    setShowTemplateConfirm(false);
  }

  function insertPlaceholder(token: string) {
    const target = blocks.find((block) => block.id === selectedBlockId && (block.type === "text" || block.type === "placeholder" || block.type === "heading"));
    if (target) {
      updateBlock(target.id, { content: `${target.content ?? ""}${token}` });
    } else {
      const block: DocumentBlock = { id: crypto.randomUUID(), type: "text", content: token };
      setBlocks((current) => [...current, block]);
      recordHistory([...blocks, block]);
      setDirty(true);
      setSelectedBlockId(block.id);
    }
  }

  function addPricingTable() {
    const block: DocumentBlock = { id: crypto.randomUUID(), type: "table", rows: [["Item", "Qty", "Harga", "Jumlah"], ["", "", "", ""]] };
    setBlocks((current) => [...current, block]);
    recordHistory([...blocks, block]);
    setDirty(true);
    setSelectedBlockId(block.id);
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
        lang,
      );
      const mediaBlock = buildDocumentMediaBlock(kind, record);
      setBlocks((current) => current.map((block) => block.id === blockId ? { ...mediaBlock, id: blockId } : block));
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
      setUploadProgress((p) => { const next = { ...p }; delete next[blockId]; return next; });
      if (kind === "image" && imageInputRef.current) imageInputRef.current.value = "";
      if (kind === "attachment" && attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  const uploading = uploadingId !== null;
  function undo() { if (historyIndex <= 0) return; const next = history[historyIndex - 1]; setHistoryIndex(historyIndex - 1); setBlocks(next); setDirty(true); }
  function redo() { if (historyIndex >= history.length - 1) return; const next = history[historyIndex + 1]; setHistoryIndex(historyIndex + 1); setBlocks(next); setDirty(true); }
  function recordHistory(next: DocumentBlock[]) { setHistory((current) => [...current.slice(0, historyIndex + 1), next].slice(-30)); setHistoryIndex((current) => Math.min(current + 1, 29)); }
  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const from = blocks.findIndex((block) => block.id === draggedId);
    const to = blocks.findIndex((block) => block.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next); recordHistory(next); setDirty(true); setDraggedBlockId(null);
  }

  function selectBlock(id: string) {
    setSelectedBlockId(id);
    const node = blockRefs.current[id];
    const scroller = canvasScrollRef.current;
    if (node && scroller) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-slate-100">
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">{backHref && <Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t("Kembali", "Back")}><Link href={backHref}><ArrowLeft className="h-4 w-4" /></Link></Button>}<div className="min-w-0"><h1 className="font-semibold">{kind === "proposal" ? t("Editor proposal", "Proposal editor") : t("Editor kontrak", "Contract editor")}</h1><p className="text-xs text-muted-foreground">{stale ? t("Dokumen berubah di tempat lain — muat ulang untuk melanjutkan", "Document changed elsewhere — reload to continue") : saving || pending ? t("Menyimpan...", "Saving...") : dirty ? t("Perubahan belum tersimpan", "Unsaved changes") : t("Perubahan tersimpan", "Changes saved")}</p></div></div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-md border bg-muted/40 p-0.5 sm:flex">
            {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([name, Icon]) => <Button key={name} type="button" variant={device === name ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setDevice(name)} aria-label={name} aria-pressed={device === name}><Icon className="h-3.5 w-3.5" /></Button>)}
          </div>
          <Button type="button" variant="ghost" size="icon" className="hidden h-8 w-8 sm:inline-flex" onClick={undo} disabled={historyIndex <= 0} title={t("Urungkan", "Undo")}><Undo2 className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="hidden h-8 w-8 sm:inline-flex" onClick={redo} disabled={historyIndex >= history.length - 1} title={t("Ulangi", "Redo")}><Redo2 className="h-4 w-4" /></Button>
          <Button type="button" size="sm" variant="outline" className="lg:hidden" onClick={() => setShowTools(true)}>{t("Blok", "Blocks")}</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowPreview(true)}><Eye className="mr-1.5 h-4 w-4" />{t("Pratinjau", "Preview")}</Button>
          <Button size="sm" onClick={() => startTransition(() => { void save(); })} disabled={!dirty || saving || pending || stale}>{t("Simpan", "Save")}</Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r bg-white p-4 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Struktur", "Structure")}</p>
          <div className="space-y-1">
            {blocks.map((block, index) => (
              <button key={block.id} type="button" draggable onDragStart={() => setDraggedBlockId(block.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => draggedBlockId && reorder(draggedBlockId, block.id)} onDragEnd={() => setDraggedBlockId(null)} onClick={() => selectBlock(block.id)} title={t("Seret untuk mengurutkan", "Drag to reorder")} className={`flex w-full cursor-grab items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selectedBlockId === block.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                <span className="truncate">{blockLabel(block.type)}</span>
              </button>
            ))}
          </div>
        </aside>
        <main ref={canvasScrollRef} className="min-w-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4 sm:p-8">
        <section className={`mx-auto min-h-[calc(100vh-12rem)] space-y-3 rounded-lg border bg-white p-6 shadow-sm transition-[width] ${device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "max-w-3xl"}`}>
          {blocks.map((block, index) => (
            <div key={block.id} ref={(node) => { blockRefs.current[block.id] = node; }} onClick={() => setSelectedBlockId(block.id)} className={`group relative rounded border p-1 hover:border-slate-200 ${selectedBlockId === block.id ? "border-primary/40 ring-1 ring-primary/20" : "border-transparent"}`}>
              {block.type === "heading" ? <Input value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} className={`text-xl font-semibold ${block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left"}`} placeholder={t("Judul bagian", "Section heading")} /> : block.type === "text" || block.type === "placeholder" ? <Textarea className={`max-w-full break-words [overflow-wrap:anywhere] ${block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left"}`} value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} rows={3} placeholder={block.type === "placeholder" ? "{{client_name}}" : t("Tulis isi dokumen...", "Write document content...")} /> : block.type === "list" ? <Textarea value={(block.items ?? []).join("\n")} onChange={(e) => { const items = e.target.value.split("\n"); setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, items } : item)); setDirty(true); }} rows={3} placeholder={t("Satu item per baris", "One item per line")} /> : block.type === "table" ? <TableBlockEditor block={block} t={t} onChange={(rows) => updateBlock(block.id, { rows })} /> : block.type === "divider" ? <hr className="border-slate-300" /> : block.type === "image" ? <div className="space-y-2">
                {uploadingId === block.id ? (
                  <div className="flex items-center gap-2 rounded border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("Mengunggah gambar...", "Uploading image...")} {uploadProgress[block.id] ?? 0}%
                  </div>
                ) : isSafeImageBlock(block) ? (
                  <figure className="my-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.src} alt={block.fileName ?? t("Gambar", "Image")} className="max-h-72 rounded-lg border border-slate-200" />
                    <figcaption className="mt-1 text-xs text-muted-foreground">{block.fileName}</figcaption>
                  </figure>
                ) : (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t("Gambar tidak valid — hanya file workspace yang didukung.", "Invalid image — only workspace files are supported.")}</div>
                )}
              </div> : block.type === "attachment" ? <div className="space-y-2">
                {uploadingId === block.id ? (
                  <div className="flex items-center gap-2 rounded border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("Mengunggah lampiran...", "Uploading attachment...")} {uploadProgress[block.id] ?? 0}%
                  </div>
                ) : block.fileId ? (
                  <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                    <span className="flex-1 truncate">{block.fileName ?? t("Lampiran", "Attachment")}</span>
                    {block.sizeBytes ? <span className="text-xs text-muted-foreground">{(block.sizeBytes / 1024).toFixed(0)} KB</span> : null}
                    <a href={`/api/files/${block.fileId}/download`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t("Buka", "Open")}</a>
                  </div>
                ) : (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t("Lampiran tidak valid.", "Invalid attachment.")}</div>
                )}
              </div> : block.type === "signature" ? <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">{t("Tempat tanda tangan client", "Client signature area")}</div> : <div className="text-sm text-muted-foreground">{blockLabel(block.type)}</div>}
              {block.type !== "signature" && (
                <div className="absolute -right-1 -top-1 hidden items-center gap-0.5 group-hover:flex">
                  <button type="button" className="rounded bg-white p-1 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900" title={t("Naik", "Move up")} onClick={() => move(block.id, -1)} disabled={index === 0 || uploading}><ArrowUp className="h-3 w-3" /></button>
                  <button type="button" className="rounded bg-white p-1 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900" title={t("Turun", "Move down")} onClick={() => move(block.id, 1)} disabled={index === blocks.length - 1 || uploading}><ArrowDown className="h-3 w-3" /></button>
                  <button type="button" className="rounded bg-white p-1 text-xs text-red-600 shadow-sm ring-1 ring-slate-200 hover:bg-red-50" title={t("Hapus", "Delete")} onClick={() => remove(block.id)} disabled={uploading}><Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          ))}
        </section>
        </main>
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l bg-white p-4 lg:block">
          <div className="mb-4 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Sisipkan", "Insert")}</p><span className="text-[11px] text-muted-foreground">{t("Properti", "Properties")}</span></div>
          {selectedBlockId ? (() => { const sel = blocks.find((block) => block.id === selectedBlockId); const isTextLike = sel?.type === "heading" || sel?.type === "text" || sel?.type === "placeholder"; return <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-sm"><p className="font-medium">{blockLabel(sel?.type ?? "")}</p><p className="mt-1 text-xs text-muted-foreground">{t("Klik block di canvas untuk edit. Drag item Struktur untuk reorder.", "Click a block on the canvas to edit. Drag items in Structure to reorder.")}</p>{sel?.type === "heading" ? <label className="mt-3 block text-xs text-muted-foreground">{t("Ukuran heading", "Heading size")}<select className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm text-foreground" value={sel.level ?? 2} onChange={(event) => selectedBlockId && updateBlock(selectedBlockId, { level: Number(event.target.value) as 1 | 2 | 3 })}><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select></label> : null}{sel?.type === "list" ? <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={Boolean(sel.ordered)} onChange={(event) => selectedBlockId && updateBlock(selectedBlockId, { ordered: event.target.checked })} />{t("List bernomor", "Numbered list")}</label> : null}{isTextLike ? <div className="mt-3"><p className="text-xs text-muted-foreground">{t("Perataan teks", "Text alignment")}</p><div className="mt-1 grid grid-cols-3 gap-1 rounded-md border bg-white p-0.5">{([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([align, Icon]) => <button key={align} type="button" onClick={() => selectedBlockId && updateBlock(selectedBlockId, { align })} aria-pressed={sel.align === align} title={align} className={`flex items-center justify-center rounded px-2 py-1.5 transition-colors ${sel.align === align ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-3.5 w-3.5" /></button>)}</div></div> : null}</div>; })() : null}
          <div className="grid gap-2">
            {(["heading", "text", "placeholder", "list", "divider", "table"] as AddableBlock[]).map((type) => (
              <Button key={type} type="button" variant="outline" className="justify-start" onClick={() => add(type)}>+ {blockLabel(type)}</Button>
            ))}
            {kind === "proposal" && <Button type="button" variant="outline" className="justify-start" onClick={addPricingTable}>+ {t("Pricing Table", "Pricing Table")}</Button>}
            {kind === "proposal" && <Button type="button" variant="outline" className="justify-start" onClick={handleStartFromTemplate}>+ {t("Mulai dari template", "Start from template")}</Button>}
            {kind === "proposal" && <>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload("image", e.target.files?.[0])} />
              <Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => imageInputRef.current?.click()}><Upload className="mr-2 h-3.5 w-3.5" />{t("Gambar", "Image")}</Button>
              <input ref={attachmentInputRef} type="file" className="hidden" onChange={(e) => handleMediaUpload("attachment", e.target.files?.[0])} />
              <Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => attachmentInputRef.current?.click()}><Paperclip className="mr-2 h-3.5 w-3.5" />{t("Lampiran", "Attachment")}</Button>
            </>}
          </div>
          {kind === "proposal" && <div className="mt-4 rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Placeholder", "Placeholder")}</p>
            <div className="flex flex-wrap gap-1.5">
              {["{{client_name}}", "{{client_email}}", "{{company_name}}", "{{workspace_name}}", "{{proposal_number}}", "{{valid_until}}", "{{today}}", "{{total_amount}}", "{{down_payment}}", "{{subtotal}}", "{{tax}}"].map((token) => (
                <button key={token} type="button" onClick={() => insertPlaceholder(token)} className="rounded-full border bg-white px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary" title={t("Sisipkan ke blok terpilih", "Insert into selected block")}>{token}</button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("Klik chip untuk menyisipkan ke blok teks terpilih.", "Click a chip to insert it into the selected text block.")}</p>
          </div>}
        </aside>
      </div>
      <div className="sticky bottom-0 z-20 flex shrink-0 items-center justify-between gap-3 border-t bg-white/95 px-4 py-2 text-xs text-muted-foreground backdrop-blur" role="status" aria-live="polite">
        <span>{blocks.length} {t("blok", blocks.length === 1 ? "block" : "blocks")} · {saving || pending ? t("Menyimpan...", "Saving...") : dirty ? t("Belum tersimpan", "Not saved") : t("Tersimpan", "Saved")}</span>
      </div>
      {showTools && <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setShowTools(false)}>
        <aside className="absolute right-0 top-0 h-full w-72 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">{t("Blok", "Blocks")}</p><Button type="button" variant="ghost" size="icon" onClick={() => setShowTools(false)} aria-label={t("Tutup blok", "Close blocks")}><X className="h-4 w-4" /></Button></div>
          <div className="grid gap-2">
            {(["heading", "text", "placeholder", "list", "divider", "table"] as AddableBlock[]).map((type) => <Button key={type} type="button" variant="outline" className="justify-start" onClick={() => { add(type); setShowTools(false); }}>+ {blockLabel(type)}</Button>)}
            {kind === "proposal" && <Button type="button" variant="outline" className="justify-start" onClick={() => { addPricingTable(); setShowTools(false); }}>+ {t("Pricing Table", "Pricing Table")}</Button>}
            {kind === "proposal" && <Button type="button" variant="outline" className="justify-start" onClick={() => { setShowTools(false); handleStartFromTemplate(); }}>+ {t("Mulai dari template", "Start from template")}</Button>}
            {kind === "proposal" && <><Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => { setShowTools(false); imageInputRef.current?.click(); }}><Upload className="mr-2 h-3.5 w-3.5" />{t("Gambar", "Image")}</Button><Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => { setShowTools(false); attachmentInputRef.current?.click(); }}><Paperclip className="mr-2 h-3.5 w-3.5" />{t("Lampiran", "Attachment")}</Button></>}
          </div>
        </aside>
      </div>}
      {showTemplateConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-w-sm rounded-lg border bg-background p-6 shadow-xl">
          <h3 className="mb-2 font-semibold">{t("Ganti dengan template?", "Replace with template?")}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{t("Dokumen ini sudah berisi konten. Semua blok saat ini akan diganti dengan template proposal. Lanjutkan?", "This document already has content. All current blocks will be replaced with the proposal template. Continue?")}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowTemplateConfirm(false)}>{t("Batal", "Cancel")}</Button>
            <Button type="button" className="flex-1" onClick={applyStarterTemplate}>{t("Ganti Saja", "Replace Anyway")}</Button>
          </div>
        </div>
      </div>}
      {showPreview && <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-10" onClick={() => setShowPreview(false)}>
        <section className="mx-auto max-h-full max-w-3xl overflow-y-auto rounded-lg bg-white p-8 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold">{t("Pratinjau", "Preview")}</h2><Button type="button" variant="ghost" size="icon" onClick={() => setShowPreview(false)} aria-label={t("Tutup preview", "Close preview")}><X className="h-4 w-4" /></Button></div>
          <div className="min-w-0 space-y-4 break-words [overflow-wrap:anywhere]">{blocks.map((block) => <div key={block.id} className="min-w-0 break-words text-sm text-slate-700 [overflow-wrap:anywhere]">{renderDocumentBlockHtml(block, placeholderValues)}</div>)}</div>
        </section>
      </div>}
    </div>
  );
}
