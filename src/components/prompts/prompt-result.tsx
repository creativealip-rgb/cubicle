"use client";

import { useState } from "react";
import { Check, Copy, FileText, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { PromptGenerationResult } from "@/lib/prompts/build-prompt";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";

type PromptResultProps = {
  result: PromptGenerationResult | null;
  loading: boolean;
  view?: "cards" | "prompt";
  onEdit(): void;
  onRegenerate(): void;
};

/** Copy helper with a fallback for browsers without the async clipboard API. */
async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

/** Small copy button with a transient "Copied" state. */
function CopyButton({ text, actionLabel, doneLabel, toastLabel }: { text: string; actionLabel: string; doneLabel: string; toastLabel: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await writeClipboard(text);
    setCopied(true);
    toast.success(toastLabel);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Button variant="outline" size="sm" className="h-6 shrink-0 px-2 text-[11px]" onClick={copy}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? doneLabel : actionLabel}
    </Button>
  );
}

/** Raw JSON representation of the full generation result (for the "Prompt" tab). */
function promptJson(result: PromptGenerationResult): string {
  return JSON.stringify(result, null, 2);
}

export function PromptResult({ result, loading, view = "cards", onEdit, onRegenerate }: PromptResultProps) {
  const { t } = useT();
  if (loading) return <div className="flex min-h-[220px] items-center justify-center rounded-xl border bg-white p-4"><div className="text-center"><div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/><p className="text-xs font-medium">{t("Menyusun materi…", "Generating…")}</p><p className="text-[11px] text-muted-foreground">{t("Brief sedang diolah menjadi hasil siap pakai.", "Your brief is being turned into ready-to-use material.")}</p></div></div>;
  if (!result) return <div className="flex min-h-[220px] items-center justify-center rounded-xl border bg-white p-4 text-center"><div><FileText className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50"/><p className="text-xs font-semibold">{t("Hasil akan muncul di sini", "Your result will appear here")}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{t("Pilih jenis konten, isi brief, lalu generate materi.", "Pick a content type, fill in the brief, then generate.")}</p></div></div>;

  const json = promptJson(result);

  return <div className="min-h-[220px] rounded-xl border bg-white p-3.5 sm:p-4">
    <div className="mb-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-primary">{t("Hasil", "Result")}</p>
      <h2 className="mt-0.5 text-base font-semibold">{result.title}</h2>
      <div className="mt-2.5 flex flex-wrap items-center justify-end gap-1.5 border-t pt-2.5">
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5"/>{t("Edit brief", "Edit brief")}</Button>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onRegenerate}><RotateCcw className="mr-1 h-3.5 w-3.5"/>{t("Generate ulang", "Regenerate")}</Button>
      </div>
    </div>
    {view === "prompt" ? (
      <div>
        <div className="max-h-[380px] overflow-auto rounded-lg bg-slate-950 p-3">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-4 text-slate-100">{json}</pre>
        </div>
        <div className="mt-2.5">
          <CopyButton text={json} actionLabel={t("Copy JSON", "Copy JSON")} doneLabel={t("Tersalin", "Copied")} toastLabel={t("JSON prompt disalin", "Prompt JSON copied")} />
        </div>
      </div>
    ) : (
      <div className="space-y-2.5">
        {result.readyOutput.map((item, index) => (
          <div key={`${item.label}-${index}`} className="rounded-lg border bg-slate-50/70 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <CopyButton text={item.content} actionLabel={t("Copy", "Copy")} doneLabel={t("Tersalin", "Copied")} toastLabel={t("Hasil disalin", "Result copied")} />
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
          </div>
        ))}
      </div>
    )}
  </div>;
}
