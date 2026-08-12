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
import { ArrowDown, ArrowUp, Loader2, Paperclip, Trash2, Upload } from "lucide-react";

type Props = {
  kind: "proposal" | "contract";
  workspaceId: string;
  initialBlocks: DocumentBlock[];
  initialRevision?: number;
  placeholderValues?: DocumentPlaceholderValues;
  saveBlocks: (blocks: DocumentBlock[], revision: number) => Promise<unknown>;
};

type AddableBlock = "text" | "heading" | "placeholder" | "image" | "attachment";

export function DocumentBlockEditor({ kind, workspaceId, initialBlocks, initialRevision = 1, placeholderValues = {}, saveBlocks }: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
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
    setBlocks((current) => [...current, { id: crypto.randomUUID(), type, content: type === "placeholder" ? "{{client_name}}" : "", level: type === "heading" ? 2 : undefined }]);
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
        <Button size="sm" onClick={() => startTransition(() => { void save(); })} disabled={!dirty || saving || pending || stale}>Simpan</Button>
      </div>
      <main className="mx-auto max-w-3xl space-y-3 p-4 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => add("heading")}>+ Heading</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("text")}>+ Teks</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("placeholder")}>+ Placeholder</Button>
          {kind === "proposal" && <>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload("image", e.target.files?.[0])} />
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => imageInputRef.current?.click()}>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} + Gambar</Button>
            <input ref={attachmentInputRef} type="file" className="hidden" onChange={(e) => handleMediaUpload("attachment", e.target.files?.[0])} />
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => attachmentInputRef.current?.click()}>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />} + Lampiran</Button>
          </>}
        </div>
        <section className="space-y-3 rounded-lg border bg-white p-6 shadow-sm">
          {blocks.map((block, index) => (
            <div key={block.id} className="group relative rounded border border-transparent p-1 hover:border-slate-200">
              {block.type === "heading" ? <Input value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} className="text-xl font-semibold" placeholder="Judul bagian" /> : block.type === "text" || block.type === "placeholder" ? <Textarea value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} rows={3} placeholder={block.type === "placeholder" ? "{{client_name}}" : "Tulis isi dokumen..."} /> : block.type === "image" ? <div className="space-y-2">
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
        <section className="space-y-3 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">{t("Pratinjau", "Preview")}</h2>
          {blocks.map((block) => (
            <div key={block.id} className="whitespace-pre-wrap text-sm text-slate-700">
              {renderDocumentBlock(block, placeholderValues)}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
