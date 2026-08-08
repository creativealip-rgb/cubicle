"use client";

import { useState } from "react";
import { Check, Copy, FileText, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { PromptGenerationResult } from "@/lib/prompts/build-prompt";
import { toast } from "sonner";

export function PromptResult({ result, loading, onEdit, onRegenerate }: { result: PromptGenerationResult | null; loading: boolean; onEdit(): void; onRegenerate(): void }) {
  const [copied, setCopied] = useState(false);
  if (loading) return <div className="flex min-h-[220px] items-center justify-center rounded-xl border bg-white p-4"><div className="text-center"><div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/><p className="text-xs font-medium">Menyusun materi…</p><p className="text-[11px] text-muted-foreground">Brief sedang diolah menjadi hasil siap pakai.</p></div></div>;
  if (!result) return <div className="flex min-h-[220px] items-center justify-center rounded-xl border bg-white p-4 text-center"><div><FileText className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50"/><p className="text-xs font-semibold">Hasil akan muncul di sini</p><p className="mt-0.5 text-[11px] text-muted-foreground">Pilih jenis konten, isi brief, lalu generate materi.</p></div></div>;
  const rawJson = JSON.stringify(result, null, 2);
  async function copy(text: string) { await navigator.clipboard.writeText(text); setCopied(true); toast.success("Hasil disalin"); setTimeout(() => setCopied(false), 1500); }
  return <div className="min-h-[220px] rounded-xl border bg-white p-3.5 sm:p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-medium uppercase tracking-wide text-primary">Hasil</p><h2 className="mt-0.5 text-base font-semibold">{result.title}</h2></div><div className="flex gap-1.5"><Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5"/>Edit brief</Button><Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onRegenerate}><RotateCcw className="mr-1 h-3.5 w-3.5"/>Generate ulang</Button></div></div>
    <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-[11px] leading-4 text-slate-100">{rawJson}</pre>
    <Button size="sm" className="mt-2.5 h-8 text-xs" onClick={() => copy(rawJson)}>{copied ? <Check className="mr-1.5 h-3.5 w-3.5"/> : <Copy className="mr-1.5 h-3.5 w-3.5"/>}Copy JSON</Button>
  </div>;
}
