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
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-card p-6 shadow-xs">
        <div className="text-center space-y-2">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-foreground">{t("Menyusun materi dengan AI…", "Generating with AI…")}</p>
          <p className="text-[11px] text-muted-foreground">{t("Brief sedang diolah menjadi materi visual & copy siap pakai.", "Transforming brief into ready-to-use visuals & copy.")}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-card p-6 text-center shadow-xs">
        <div className="space-y-2 max-w-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("Hasil Generasi Prompt", "Prompt Generation Output")}</p>
          <p className="text-xs text-muted-foreground">{t("Pilih template konten di atas, isi formulir brief, lalu klik tombol Generate.", "Select a template above, fill out the brief, and hit Generate.")}</p>
        </div>
      </div>
    );
  }

  const json = promptJson(result);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
      <div className="border-b pb-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{t("Hasil Generasi", "Generated Result")}</p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs rounded-lg" onClick={onEdit}>
              <Pencil className="mr-1 h-3 w-3" />{t("Edit brief", "Edit brief")}
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs rounded-lg" onClick={onRegenerate}>
              <RotateCcw className="mr-1 h-3 w-3" />{t("Generate ulang", "Regenerate")}
            </Button>
          </div>
        </div>
        <h2 className="mt-1 text-sm sm:text-base font-semibold text-foreground">{result.title}</h2>
      </div>

      {view === "prompt" ? (
        <div className="space-y-2">
          <div className="max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-3.5 border border-slate-800">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-100">{json}</pre>
          </div>
          <div className="flex justify-end">
            <CopyButton text={json} actionLabel={t("Copy JSON", "Copy JSON")} doneLabel={t("Tersalin", "Copied")} toastLabel={t("JSON prompt disalin", "Prompt JSON copied")} />
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {result.readyOutput.map((item, index) => (
            <div key={`${item.label}-${index}`} className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <CopyButton text={item.content} actionLabel={t("Copy", "Copy")} doneLabel={t("Tersalin", "Copied")} toastLabel={t("Hasil disalin", "Result copied")} />
              </div>
              <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-foreground">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
