"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  buildDocumentMediaBlock,
  isSafeImageBlock,
  type DocumentBlock,
} from "@/lib/document-blocks";
import { uploadOneFile, MAX_UPLOAD_BYTES } from "@/lib/files-upload";
import { useT } from "@/lib/i18n-client";
import { renderDocumentBlock } from "@/lib/document-block-renderer";
import type { DocumentPlaceholderValues } from "@/lib/document-placeholders";
import { ArrowDown, ArrowUp, Eye, Loader2, Paperclip, Trash2, Upload, X } from "lucide-react";

type Props = {
  kind: "proposal" | "contract";
  workspaceId: string;
  initialBlocks: DocumentBlock[];
  initialRevision?: number;
  placeholderValues?: DocumentPlaceholderValues;
  saveBlocks: (blocks: DocumentBlock[], revision: number) => Promise<unknown>;
};

type AddableBlock = "text" | "heading" | "placeholder" | "list" | "divider" | "table" | "image" | "attachment";

export function DocumentBlockEditor({ kind, workspaceId, initialBlocks, initialRevision = 1, placeholderValues = {}, saveBlocks }: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(initialRevision);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const { lang, t } = useT();

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
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }, [blocks, dirty, saveBlocks, saving, stale]);

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

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <div><h1 className="font-semibold">{kind === "proposal" ? "Proposal editor" : "Contract editor"}</h1><p className="text-xs text-muted-foreground">{stale ? "Dokumen berubah di tempat lain — muat ulang untuk melanjutkan" : saving || pending ? "Menyimpan..." : dirty ? "Perubahan belum tersimpan" : "Perubahan tersimpan"}</p></div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="lg:hidden" onClick={() => setShowTools(true)}>Blok</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowPreview(true)}><Eye className="mr-1.5 h-4 w-4" />Preview</Button>
          <Button size="sm" onClick={() => startTransition(() => { void save(); })} disabled={!dirty || saving || pending || stale}>Simpan</Button>
        </div>
      </div>
      <div className="flex min-h-[calc(100vh-5rem)]">
        <main className="min-w-0 flex-1 space-y-3 p-4 sm:p-8">
        <section className="mx-auto max-w-3xl space-y-3 rounded-lg border bg-white p-6 shadow-sm">
          {blocks.map((block, index) => (
            <div key={block.id} className="group relative rounded border border-transparent p-1 hover:border-slate-200">
              {block.type === "heading" ? <Input value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} className="text-xl font-semibold" placeholder="Judul bagian" /> : block.type === "text" || block.type === "placeholder" ? <Textarea value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} rows={3} placeholder={block.type === "placeholder" ? "{{client_name}}" : "Tulis isi dokumen..."} /> : block.type === "list" ? <Textarea value={(block.items ?? []).join("\n")} onChange={(e) => { const items = e.target.value.split("\n"); setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, items } : item)); setDirty(true); }} rows={3} placeholder="Satu item per baris" /> : block.type === "table" ? <Textarea value={(block.rows ?? []).map((row) => row.join(" | ")).join("\n")} onChange={(e) => { const rows = e.target.value.split("\n").map((row) => row.split("|")); setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, rows } : item)); setDirty(true); }} rows={4} placeholder="Kolom dipisah |" /> : block.type === "divider" ? <hr className="border-slate-300" /> : block.type === "image" ? <div className="space-y-2">
                {uploadingId === block.id ? (
                  <div className="flex items-center gap-2 rounded border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("Mengunggah gambar...", "Uploading image...")} {uploadProgress[block.id] ?? 0}%
                  </div>
                ) : isSafeImageBlock(block) ? (
                  <figure className="my-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.src} alt={block.fileName ?? "Gambar"} className="max-h-72 rounded-lg border border-slate-200" />
                    <figcaption className="mt-1 text-xs text-muted-foreground">{block.fileName}</figcaption>
                  </figure>
                ) : (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Gambar tidak valid — hanya file workspace yang didukung.</div>
                )}
              </div> : block.type === "attachment" ? <div className="space-y-2">
                {uploadingId === block.id ? (
                  <div className="flex items-center gap-2 rounded border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("Mengunggah lampiran...", "Uploading attachment...")} {uploadProgress[block.id] ?? 0}%
                  </div>
                ) : block.fileId ? (
                  <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                    <span className="flex-1 truncate">{block.fileName ?? "Lampiran"}</span>
                    {block.sizeBytes ? <span className="text-xs text-muted-foreground">{(block.sizeBytes / 1024).toFixed(0)} KB</span> : null}
                    <a href={`/api/files/${block.fileId}/download`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Buka</a>
                  </div>
                ) : (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Lampiran tidak valid.</div>
                )}
              </div> : block.type === "signature" ? <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">Tempat tanda tangan client</div> : <div className="text-sm text-muted-foreground">Block {block.type}</div>}
              {block.type !== "signature" && (
                <div className="absolute -right-1 -top-1 hidden items-center gap-0.5 group-hover:flex">
                  <button type="button" className="rounded bg-white p-1 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900" title="Naik" onClick={() => move(block.id, -1)} disabled={index === 0 || uploading}><ArrowUp className="h-3 w-3" /></button>
                  <button type="button" className="rounded bg-white p-1 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900" title="Turun" onClick={() => move(block.id, 1)} disabled={index === blocks.length - 1 || uploading}><ArrowDown className="h-3 w-3" /></button>
                  <button type="button" className="rounded bg-white p-1 text-xs text-red-600 shadow-sm ring-1 ring-slate-200 hover:bg-red-50" title="Hapus" onClick={() => remove(block.id)} disabled={uploading}><Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          ))}
        </section>
        </main>
        <aside className="hidden w-64 shrink-0 border-l bg-white p-4 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blok</p>
          <div className="grid gap-2">
            {(["heading", "text", "placeholder", "list", "divider", "table"] as AddableBlock[]).map((type) => (
              <Button key={type} type="button" variant="outline" className="justify-start" onClick={() => add(type)}>+ {type === "text" ? "Teks" : type[0].toUpperCase() + type.slice(1)}</Button>
            ))}
            {kind === "proposal" && <>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload("image", e.target.files?.[0])} />
              <Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => imageInputRef.current?.click()}><Upload className="mr-2 h-3.5 w-3.5" />Gambar</Button>
              <input ref={attachmentInputRef} type="file" className="hidden" onChange={(e) => handleMediaUpload("attachment", e.target.files?.[0])} />
              <Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => attachmentInputRef.current?.click()}><Paperclip className="mr-2 h-3.5 w-3.5" />Lampiran</Button>
            </>}
          </div>
          <Button type="button" className="mt-6 w-full" variant="outline" onClick={() => setShowPreview(true)}><Eye className="mr-2 h-4 w-4" />Preview</Button>
        </aside>
      </div>
      {showTools && <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setShowTools(false)}>
        <aside className="absolute right-0 top-0 h-full w-72 bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">Blok</p><Button type="button" variant="ghost" size="icon" onClick={() => setShowTools(false)} aria-label="Tutup blok"><X className="h-4 w-4" /></Button></div>
          <div className="grid gap-2">
            {(["heading", "text", "placeholder", "list", "divider", "table"] as AddableBlock[]).map((type) => <Button key={type} type="button" variant="outline" className="justify-start" onClick={() => { add(type); setShowTools(false); }}>+ {type === "text" ? "Teks" : type[0].toUpperCase() + type.slice(1)}</Button>)}
            {kind === "proposal" && <><Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => { setShowTools(false); imageInputRef.current?.click(); }}><Upload className="mr-2 h-3.5 w-3.5" />Gambar</Button><Button type="button" variant="outline" className="justify-start" disabled={uploading} onClick={() => { setShowTools(false); attachmentInputRef.current?.click(); }}><Paperclip className="mr-2 h-3.5 w-3.5" />Lampiran</Button></>}
          </div>
        </aside>
      </div>}
      {showPreview && <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-10" onClick={() => setShowPreview(false)}>
        <section className="mx-auto max-h-full max-w-3xl overflow-y-auto rounded-lg bg-white p-8 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold">Preview</h2><Button type="button" variant="ghost" size="icon" onClick={() => setShowPreview(false)} aria-label="Tutup preview"><X className="h-4 w-4" /></Button></div>
          <div className="space-y-4">{blocks.map((block) => <div key={block.id} className="whitespace-pre-wrap text-sm text-slate-700">{renderDocumentBlock(block, placeholderValues)}</div>)}</div>
        </section>
      </div>}
    </div>
  );
}
