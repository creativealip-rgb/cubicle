"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitQuestionnaire } from "@/lib/actions/questionnaires";
import { Loader2, CheckCircle2, Star, Paperclip, PenTool } from "lucide-react";
import type { QuestionnaireField } from "@/lib/questionnaire-schema";

export function IntakeForm({ token, fields }: { token: string; fields: QuestionnaireField[] }) {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setVal(id: string, val: string | string[] | number) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function handleMultiSelect(id: string, option: string, checked: boolean) {
    setAnswers((prev) => {
      const cur = (prev[id] as string[]) || [];
      const next = checked ? [...cur, option] : cur.filter((c) => c !== option);
      return { ...prev, [id]: next };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side required check
    for (const f of fields) {
      if (f.required && f.type !== "heading") {
        const v = answers[f.id];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
          setError(`Mohon lengkapi: ${f.label}`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        await submitQuestionnaire({ token, answers });
        setSubmitted(true);
      } catch (err: any) {
        setError(err?.message || "Gagal mengirim tanggapan");
      }
    });
  }

  if (submitted) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Terima Kasih!</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tanggapan Anda telah berhasil kami terima dan akan segera kami proses untuk langkah selanjutnya.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="space-y-6">
      {fields.map((f) => {
        // Evaluate Conditional Logic
        if (f.condition?.fieldId) {
          const triggerVal = answers[f.condition.fieldId];
          const expectedVal = (f.condition.value || "").trim().toLowerCase();
          const actualVal = String(triggerVal ?? "").trim().toLowerCase();

          if (f.condition.operator === "equals" && actualVal !== expectedVal) {
            return null; // Sembunyikan jika kondisi tidak terpenuhi
          }
          if (f.condition.operator === "not_equals" && actualVal === expectedVal) {
            return null;
          }
          if (f.condition.operator === "is_filled" && !triggerVal) {
            return null;
          }
          if (f.condition.operator === "is_empty" && triggerVal) {
            return null;
          }
        }

        if (f.type === "heading") {
          return (
            <div key={f.id} className="pt-4 pb-2 border-b border-border/60 space-y-1">
              <h3 className="text-lg font-bold text-foreground">{f.label}</h3>
              {f.sublabel && <p className="text-xs text-muted-foreground">{f.sublabel}</p>}
            </div>
          );
        }

        return (
          <div key={f.id} className="space-y-2">
            <label htmlFor={`field-${f.id}`} className="text-xs font-semibold text-foreground block">
              {f.label}
              {f.required && <span className="text-destructive ml-1">*</span>}
            </label>

            {f.sublabel && <p className="text-[11px] text-muted-foreground pb-0.5">{f.sublabel}</p>}

            {f.type === "text" && (
              <Input
                id={`field-${f.id}`}
                type="text"
                placeholder={f.placeholder}
                value={(answers[f.id] as string) || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
                className="h-10 text-sm bg-background"
              />
            )}

            {f.type === "textarea" && (
              <Textarea
                id={`field-${f.id}`}
                rows={4}
                placeholder={f.placeholder}
                value={(answers[f.id] as string) || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
                className="text-sm bg-background resize-y"
              />
            )}

            {f.type === "email" && (
              <Input
                id={`field-${f.id}`}
                type="email"
                placeholder={f.placeholder || "email@perusahaan.com"}
                value={(answers[f.id] as string) || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
                className="h-10 text-sm bg-background"
              />
            )}

            {f.type === "phone" && (
              <Input
                id={`field-${f.id}`}
                type="tel"
                placeholder={f.placeholder || "+62 812..."}
                value={(answers[f.id] as string) || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
                className="h-10 text-sm bg-background"
              />
            )}

            {f.type === "url" && (
              <Input
                id={`field-${f.id}`}
                type="url"
                placeholder={f.placeholder || "https://..."}
                value={(answers[f.id] as string) || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
                className="h-10 text-sm bg-background"
              />
            )}

            {f.type === "number" && (
              <Input
                id={`field-${f.id}`}
                type="number"
                placeholder={f.placeholder}
                value={(answers[f.id] as number | string) ?? ""}
                onChange={(e) => setVal(f.id, e.target.value === "" ? "" : Number(e.target.value))}
                className="h-10 text-sm bg-background"
              />
            )}

            {f.type === "date" && (
              <Input
                id={`field-${f.id}`}
                type="date"
                value={(answers[f.id] as string) || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
                className="h-10 text-sm bg-background"
              />
            )}

            {f.type === "select" && (
              <select
                id={`field-${f.id}`}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={(answers[f.id] as string) || ""}
                onChange={(e) => setVal(f.id, e.target.value)}
              >
                <option value="">Pilih salah satu...</option>
                {(f.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {f.type === "multiselect" && (
              <div
                id={`field-${f.id}`}
                role="group"
                aria-label={f.label}
                className="space-y-2 border border-border/80 rounded-lg p-3 bg-muted/20"
              >
                {(f.options || []).map((opt) => {
                  const cur = (answers[f.id] as string[]) || [];
                  return (
                    <label key={opt} className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        checked={cur.includes(opt)}
                        onChange={(e) => handleMultiSelect(f.id, opt, e.target.checked)}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {f.type === "file" && (
              <div className="border-2 border-dashed border-border/80 rounded-xl p-5 text-center bg-muted/10 space-y-2">
                <Paperclip className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">Upload File Brief / Dokumen</p>
                <p className="text-[10px] text-muted-foreground">{f.acceptFiles || "Format: PDF, PNG, JPG, ZIP"}</p>
                <Input
                  id={`field-${f.id}`}
                  type="text"
                  placeholder="URL Google Drive / link dokumen file..."
                  value={(answers[f.id] as string) || ""}
                  onChange={(e) => setVal(f.id, e.target.value)}
                  className="h-9 text-xs max-w-sm mx-auto mt-2"
                />
              </div>
            )}

            {f.type === "signature" && (
              <div className="border border-border/80 rounded-xl p-4 bg-muted/10 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PenTool className="h-3.5 w-3.5" />
                  <span>Ketik Nama Lengkap sebagai Tanda Tangan Digital</span>
                </div>
                <Input
                  id={`field-${f.id}`}
                  type="text"
                  placeholder="Nama Lengkap / Inisial Penandatangan..."
                  value={(answers[f.id] as string) || ""}
                  onChange={(e) => setVal(f.id, e.target.value)}
                  className="h-10 text-sm font-serif italic bg-background"
                />
              </div>
            )}

            {f.type === "rating" && (
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentRating = Number(answers[f.id]) || 0;
                  const isActive = star <= currentRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setVal(f.id, star)}
                      className="p-1 rounded-md hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          isActive
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/30 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full h-11 text-sm font-semibold shadow-xs" size="lg">
        {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Kirim Tanggapan (Submit)
      </Button>
    </form>
  );
}
