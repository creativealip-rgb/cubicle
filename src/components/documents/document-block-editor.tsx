"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { DocumentBlock } from "@/lib/document-blocks";

type Props = {
  kind: "proposal" | "contract";
  initialBlocks: DocumentBlock[];
  initialRevision?: number;
  saveBlocks: (blocks: DocumentBlock[], revision: number) => Promise<unknown>;
};

export function DocumentBlockEditor({ kind, initialBlocks, initialRevision = 1, saveBlocks }: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(initialRevision);

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

  function updateField(id: string, field: "src" | "fileName", value: string) {
    setBlocks((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
    setDirty(true);
  }

  function add(type: "text" | "heading" | "placeholder" | "image" | "attachment") {
    setBlocks((current) => [...current, { id: crypto.randomUUID(), type, content: type === "placeholder" ? "{{client_name}}" : "", level: type === "heading" ? 2 : undefined }]);
    setDirty(true);
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <div><h1 className="font-semibold">{kind === "proposal" ? "Proposal editor" : "Contract editor"}</h1><p className="text-xs text-muted-foreground">{stale ? "Dokumen berubah di tempat lain — muat ulang untuk melanjutkan" : saving || pending ? "Menyimpan..." : dirty ? "Perubahan belum tersimpan" : "Perubahan tersimpan"}</p></div>
        <Button size="sm" onClick={() => startTransition(() => { void save(); })} disabled={!dirty || saving || pending || stale}>Simpan</Button>
      </div>
      <main className="mx-auto max-w-3xl space-y-3 p-4 sm:p-8">
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => add("heading")}>+ Heading</Button><Button type="button" size="sm" variant="outline" onClick={() => add("text")}>+ Teks</Button><Button type="button" size="sm" variant="outline" onClick={() => add("placeholder")}>+ Placeholder</Button>{kind === "proposal" && <><Button type="button" size="sm" variant="outline" onClick={() => add("image")}>+ Gambar</Button><Button type="button" size="sm" variant="outline" onClick={() => add("attachment")}>+ Lampiran</Button></>}</div>
        <section className="space-y-3 rounded-lg border bg-white p-6 shadow-sm">
          {blocks.map((block) => (
            <div key={block.id} className="group relative rounded border border-transparent p-1 hover:border-slate-200">
              {block.type === "heading" ? <Input value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} className="text-xl font-semibold" placeholder="Judul bagian" /> : block.type === "text" || block.type === "placeholder" ? <Textarea value={block.content ?? ""} onChange={(e) => update(block.id, e.target.value)} rows={3} placeholder={block.type === "placeholder" ? "{{client_name}}" : "Tulis isi dokumen..."} /> : block.type === "image" ? <Input value={block.src ?? ""} onChange={(e) => updateField(block.id, "src", e.target.value)} placeholder="URL gambar" /> : block.type === "attachment" ? <Input value={block.fileName ?? ""} onChange={(e) => updateField(block.id, "fileName", e.target.value)} placeholder="Nama lampiran" /> : block.type === "signature" ? <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">Tempat tanda tangan client</div> : <div className="text-sm text-muted-foreground">Block {block.type}</div>}
              {block.type !== "signature" && <button type="button" className="absolute right-1 top-1 hidden text-xs text-red-600 group-hover:block" onClick={() => { setBlocks((current) => current.filter((item) => item.id !== block.id)); setDirty(true); }}>Hapus</button>}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
