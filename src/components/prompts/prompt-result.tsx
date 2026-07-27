"use client";

import { useState } from "react";
import { Check, Copy, FileText, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { PromptGenerationResult } from "@/lib/prompts/build-prompt";
import { toast } from "sonner";

export function PromptResult({ result, loading, onEdit, onRegenerate }: { result: PromptGenerationResult | null; loading: boolean; onEdit(): void; onRegenerate(): void }) {
  const [copied, setCopied] = useState(false);
  if (loading) return <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-white"><div className="text-center"><div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent"/><p className="font-medium">Menyusun materi…</p><p className="text-sm text-muted-foreground">Brief sedang diolah menjadi hasil siap pakai.</p></div></div>;
  if (!result) return <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-white p-6 text-center"><div><FileText className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50"/><p className="font-semibold">Hasil akan muncul di sini</p><p className="mt-1 text-sm text-muted-foreground">Pilih jenis konten, isi brief, lalu generate materi.</p></div></div>;
  const rawJson = JSON.stringify(result, null, 2);
  async function copy(text: string) { await navigator.clipboard.writeText(text); setCopied(true); toast.success("Hasil disalin"); setTimeout(() => setCopied(false), 1500); }
  return <div className="min-h-[360px] rounded-2xl border bg-white p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-primary">Hasil</p><h2 className="mt-1 text-xl font-semibold">{result.title}</h2></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-1.5 h-4 w-4"/>Edit brief</Button><Button variant="outline" size="sm" onClick={onRegenerate}><RotateCcw className="mr-1.5 h-4 w-4"/>Generate ulang</Button></div></div>
    <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{rawJson}</pre>
    <Button className="mt-3" onClick={() => copy(rawJson)}>{copied ? <Check className="mr-2 h-4 w-4"/> : <Copy className="mr-2 h-4 w-4"/>}Copy JSON</Button>
  </div>;
}
