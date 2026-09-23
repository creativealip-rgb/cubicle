"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { submitQuestionnaire } from "@/lib/actions/questionnaires";
import { useT } from "@/lib/i18n-client";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  PenTool,
  Star,
  Clock,
  Calendar,
  Info,
  ShieldCheck,
  Paperclip,
} from "lucide-react";
import type { QuestionnaireField } from "@/lib/questionnaire-schema";

export function IntakeForm({
  token,
  fields,
}: {
  token: string;
  fields: QuestionnaireField[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function setFieldValue(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check required fields
    for (const f of fields) {
      // Skip if hidden by conditional logic
      if (f.condition?.fieldId) {
        const triggerVal = answers[f.condition.fieldId];
        const match = f.condition.value
          ? String(triggerVal || "").toLowerCase().includes(f.condition.value.toLowerCase())
          : Boolean(triggerVal);
        if (!match) continue;
      }

      if (f.required && f.type !== "heading" && f.type !== "divider" && f.type !== "info") {
        const val = answers[f.id];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Pertanyaan "${f.label}" wajib diisi`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        await submitQuestionnaire({
          token,
          answers,
        });

        setSubmitted(true);
        toast.success("Tanggapan berhasil dikirimkan!");
      } catch (err: any) {
        toast.error(err?.message || "Terjadi kesalahan saat mengirim");
      }
    });
  }

  if (submitted) {
    return (
      <div className="py-12 text-center space-y-4 animate-in fade-in-0 duration-300">
        <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Terima Kasih!
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Tanggapan Anda telah berhasil kami terima. Tim kami akan segera meninjau brief Anda dan menghubungi kembali secepatnya.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="space-y-6">
      {/* 12-Column Responsive Grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {fields.map((f) => {
          // Evaluate Conditional Logic
          if (f.condition?.fieldId) {
            const triggerVal = answers[f.condition.fieldId];
            const match = f.condition.value
              ? String(triggerVal || "").toLowerCase().includes(f.condition.value.toLowerCase())
              : Boolean(triggerVal);
            if (!match) return null;
          }

          const isHalf = f.colSpan === "half";
          const colClass = isHalf ? "col-span-12 md:col-span-6" : "col-span-12";

          if (f.type === "heading") {
            return (
              <div key={f.id} className="col-span-12 pt-4 pb-1 border-b border-border/60">
                <h3 className="text-base sm:text-lg font-bold text-foreground">{f.label}</h3>
                {f.sublabel && <p className="text-xs text-muted-foreground">{f.sublabel}</p>}
              </div>
            );
          }

          if (f.type === "divider") {
            return (
              <div key={f.id} className="col-span-12 py-2">
                <hr className="border-t border-border/80" />
              </div>
            );
          }

          if (f.type === "info") {
            return (
              <div key={f.id} className="col-span-12 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                  <Info className="h-4 w-4" />
                  <span>{f.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.content || f.sublabel}
                </p>
              </div>
            );
          }

          if (f.type === "terms") {
            return (
              <div key={f.id} className="col-span-12 p-4 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`terms_${f.id}`}
                    checked={Boolean(answers[f.id])}
                    onCheckedChange={(checked) => setFieldValue(f.id, Boolean(checked))}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`terms_${f.id}`} className="text-xs font-semibold cursor-pointer">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    {f.content && <p className="text-[11px] text-muted-foreground leading-relaxed">{f.content}</p>}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={f.id} className={`${colClass} space-y-1.5`}>
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  {f.label} {f.required && <span className="text-destructive font-bold">*</span>}
                </span>
              </Label>

              {f.sublabel && <p className="text-[11px] text-muted-foreground">{f.sublabel}</p>}

              {f.type === "text" && (
                <Input
                  value={answers[f.id] || ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  placeholder={f.placeholder || "Jawaban Anda..."}
                  className="h-10 text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "textarea" && (
                <Textarea
                  value={answers[f.id] || ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  placeholder={f.placeholder || "Tuliskan rincian di sini..."}
                  rows={3}
                  className="text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "email" && (
                <Input
                  type="email"
                  value={answers[f.id] || ""}
                  onChange={(e) => {
                    setFieldValue(f.id, e.target.value);
                    if (!respondentEmail) setRespondentEmail(e.target.value);
                  }}
                  placeholder={f.placeholder || "email@perusahaan.com"}
                  className="h-10 text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "phone" && (
                <Input
                  type="tel"
                  value={answers[f.id] || ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  placeholder={f.placeholder || "+62 812-3456-7890"}
                  className="h-10 text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "number" && (
                <Input
                  type="number"
                  value={answers[f.id] || ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  placeholder={f.placeholder || "0"}
                  className="h-10 text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "date" && (
                <Input
                  type="date"
                  value={answers[f.id] || ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  className="h-10 text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "time" && (
                <Input
                  type="time"
                  value={answers[f.id] || ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  className="h-10 text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "url" && (
                <Input
                  type="url"
                  value={answers[f.id] || ""}
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
                  placeholder={f.placeholder || "https://..."}
                  className="h-10 text-xs sm:text-sm bg-background"
                />
              )}

              {f.type === "select" && (
                <Select
                  value={answers[f.id] || ""}
                  onValueChange={(val) => setFieldValue(f.id, val)}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-background">
                    <SelectValue placeholder="Pilih salah satu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options || []).map((opt, i) => (
                      <SelectItem key={i} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {f.type === "multiselect" && (
                <div className="space-y-2 pt-1">
                  {(f.options || []).map((opt, i) => {
                    const current: string[] = Array.isArray(answers[f.id]) ? answers[f.id] : [];
                    const isChecked = current.includes(opt);
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`${f.id}_opt_${i}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFieldValue(f.id, [...current, opt]);
                            } else {
                              setFieldValue(f.id, current.filter((x) => x !== opt));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`${f.id}_opt_${i}`}
                          className="text-xs font-medium cursor-pointer text-foreground"
                        >
                          {opt}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {f.type === "file" && (
                <div className="border-2 border-dashed border-border/80 rounded-xl p-5 text-center bg-muted/10 hover:bg-muted/20 transition-all space-y-2">
                  <Paperclip className="h-5 w-5 mx-auto text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">Upload file dokumen atau aset</p>
                    <p className="text-[10px] text-muted-foreground">{f.acceptFiles || "Format: PDF, DOC, PNG, ZIP"}</p>
                  </div>
                  <Input
                    type="file"
                    accept={f.acceptFiles}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFieldValue(f.id, file.name);
                        toast.success(`File ${file.name} dipilih`);
                      }
                    }}
                    className="max-w-xs mx-auto text-xs h-8.5 bg-background"
                  />
                  {answers[f.id] && (
                    <p className="text-xs font-medium text-emerald-600">✓ {answers[f.id]}</p>
                  )}
                </div>
              )}

              {f.type === "signature" && (
                <div className="border border-border/80 rounded-xl p-3 bg-muted/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PenTool className="h-3.5 w-3.5" />
                    <span>Ketik Nama Lengkap sebagai Tanda Tangan Digital:</span>
                  </div>
                  <Input
                    value={answers[f.id] || ""}
                    onChange={(e) => setFieldValue(f.id, e.target.value)}
                    placeholder="Tanda tangan / Nama Penandatangan..."
                    className="h-10 font-serif italic text-sm sm:text-base bg-background"
                  />
                </div>
              )}

              {f.type === "rating" && (
                <div className="flex items-center gap-2 pt-1">
                  {Array.from({ length: f.maxRating || 5 }).map((_, idx) => {
                    const ratingVal = idx + 1;
                    const selected = Number(answers[f.id] || 0) >= ratingVal;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFieldValue(f.id, ratingVal)}
                        className="p-1 rounded-md hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            selected
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/40 hover:text-amber-400"
                          }`}
                        />
                      </button>
                    );
                  })}
                  {answers[f.id] && (
                    <span className="text-xs font-bold text-amber-500 ml-1">
                      {answers[f.id]} / {f.maxRating || 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Button Bar */}
      <div className="pt-6 border-t border-border/60 flex items-center justify-between">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 px-6 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground shadow-sm gap-2"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>Kirim Tanggapan</span>
        </Button>
        <span className="text-[10px] text-muted-foreground">Privasi & Data Terenkripsi</span>
      </div>
    </form>
  );
}
