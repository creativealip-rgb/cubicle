"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
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
  CheckCircle,
  Loader2,
  PenTool,
  Star,
  Info,
  Paperclip,
  ArrowRight,
  ArrowLeft,
  Calculator,
} from "lucide-react";
import type { QuestionnaireField } from "@/lib/questionnaire-schema";

export function IntakeForm({
  token,
  fields,
  redirectUrl,
  thankYouMessage,
}: {
  token: string;
  fields: QuestionnaireField[];
  redirectUrl?: string | null;
  thankYouMessage?: string | null;
}) {
  const { t } = useT();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  // URL Prefill support (e.g. ?name=Budi&email=budi@pt.com)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const prefilled: Record<string, any> = {};

    fields.forEach((f) => {
      const paramVal =
        params.get(f.id) ||
        (f.type === "text" && params.get("name")) ||
        (f.type === "email" && params.get("email")) ||
        (f.type === "phone" && (params.get("phone") || params.get("wa")));

      if (paramVal) {
        prefilled[f.id] = paramVal;
      }
    });

    if (Object.keys(prefilled).length > 0) {
      setAnswers((prev) => ({ ...prefilled, ...prev }));
    }
  }, [fields]);

  // Calculate live total price from choices with optionPrices
  const totalCalculated = useMemo(() => {
    let sum = 0;
    fields.forEach((f) => {
      if (f.optionPrices) {
        const val = answers[f.id];
        if (typeof val === "string" && f.optionPrices[val]) {
          sum += f.optionPrices[val];
        } else if (Array.isArray(val)) {
          val.forEach((item) => {
            if (f.optionPrices?.[item]) {
              sum += f.optionPrices[item];
            }
          });
        }
      }
    });
    return sum;
  }, [fields, answers]);

  // Multi-Step / Multi-Page Splitting via 'page_break'
  const pages = useMemo(() => {
    const list: QuestionnaireField[][] = [];
    let currentPage: QuestionnaireField[] = [];

    for (const f of fields) {
      if (f.type === "page_break") {
        if (currentPage.length > 0) {
          list.push(currentPage);
          currentPage = [];
        }
      } else {
        currentPage.push(f);
      }
    }
    if (currentPage.length > 0 || list.length === 0) {
      list.push(currentPage);
    }
    return list;
  }, [fields]);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  function setFieldValue(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  const isLastPage = currentPageIndex === pages.length - 1;
  const currentFields = pages[currentPageIndex] || [];
  const progressPercent = Math.round(((currentPageIndex + 1) / pages.length) * 100);

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();

    // Check required fields on the current page
    for (const f of currentFields) {
      // Skip if hidden by conditional logic
      if (f.condition?.fieldId) {
        const triggerVal = answers[f.condition.fieldId];
        const match = f.condition.value
          ? String(triggerVal || "").toLowerCase().includes(f.condition.value.toLowerCase())
          : Boolean(triggerVal);
        if (!match) continue;
      }

      if (f.required && f.type !== "heading" && f.type !== "divider" && f.type !== "info" && f.type !== "page_break") {
        const val = answers[f.id];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Pertanyaan "${f.label}" wajib diisi`);
          return;
        }
      }
    }

    if (!isLastPage) {
      setCurrentPageIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Final Submit
      startTransition(async () => {
        try {
          if (token === "preview_mode") {
            setSubmitted(true);
            toast.success("Mode Preview: Tanggapan berhasil disimulasikan!");
            return;
          }

          await submitQuestionnaire({
            token,
            answers,
          });

          setSubmitted(true);
          toast.success("Tanggapan berhasil dikirimkan!");

          if (redirectUrl && typeof window !== "undefined") {
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 1500);
          }
        } catch (err: any) {
          toast.error(err?.message || "Terjadi kesalahan saat mengirim");
        }
      });
    }
  }

  if (submitted) {
    return (
      <div className="py-12 text-center space-y-4 animate-in fade-in-0 duration-300">
        <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          {t("Terima Kasih!", "Thank You!")}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {thankYouMessage || t(
            "Tanggapan Anda telah berhasil kami terima. Tim kami akan segera meninjau brief Anda dan menghubungi kembali secepatnya.",
            "Your response has been received successfully. Our team will review your submission and follow up shortly."
          )}
        </p>
        {redirectUrl && (
          <p className="text-[11px] text-primary font-medium animate-pulse">
            {t("Mengarahkan Anda ke tujuan...", "Redirecting to destination...")}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleNextStep} aria-busy={pending} className="space-y-6">
      {/* Multi-Page Progress Bar (if more than 1 page) */}
      {pages.length > 1 && (
        <div className="space-y-1.5 pb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>
              Langkah {currentPageIndex + 1} dari {pages.length}
            </span>
            <span className="font-mono text-primary font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 12-Column Responsive Grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {currentFields.map((f) => {
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
                  onChange={(e) => setFieldValue(f.id, e.target.value)}
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

              {f.type === "calculation" && (
                <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-xs sm:text-sm font-bold text-foreground">{f.label}</span>
                    </div>
                    <span className="font-mono font-extrabold text-base sm:text-lg text-primary">
                      {f.currency || "Rp"} {totalCalculated.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {f.sublabel && <p className="text-[11px] text-muted-foreground">{f.sublabel}</p>}
                </div>
              )}
              {f.type === "image_choice" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {(f.imageOptions || []).map((imgOpt, idx) => {
                    const selected = answers[f.id] === imgOpt.label;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFieldValue(f.id, imgOpt.label)}
                        className={`rounded-xl border overflow-hidden text-left transition-all p-1 flex flex-col group cursor-pointer ${
                          selected
                            ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                            : "border-border/80 hover:border-border hover:shadow-xs bg-card"
                        }`}
                      >
                        <div className="aspect-4/3 w-full rounded-lg bg-muted/30 overflow-hidden mb-1.5 relative">
                          <img
                            src={imgOpt.imageUrl}
                            alt={imgOpt.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {selected && (
                            <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <p className={`text-xs font-semibold px-1 truncate ${selected ? "text-primary" : "text-foreground"}`}>
                          {imgOpt.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {f.type === "matrix" && (
                <div className="overflow-x-auto border border-border/80 rounded-xl bg-card">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/70">
                      <tr>
                        <th className="p-3">Aspek / Evaluasi</th>
                        {(f.matrixCols || []).map((col, idx) => (
                          <th key={idx} className="p-3 text-center">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(f.matrixRows || []).map((row, rIdx) => {
                        const currentMatrixAns = answers[f.id] || {};
                        return (
                          <tr key={rIdx} className="hover:bg-muted/20">
                            <td className="p-3 font-medium text-foreground">{row}</td>
                            {(f.matrixCols || []).map((col, cIdx) => (
                              <td key={cIdx} className="p-3 text-center">
                                <input
                                  type="radio"
                                  name={`matrix_${f.id}_${rIdx}`}
                                  checked={currentMatrixAns[row] === col}
                                  onChange={() => {
                                    setFieldValue(f.id, {
                                      ...currentMatrixAns,
                                      [row]: col,
                                    });
                                  }}
                                  className="h-4 w-4 text-primary cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

      {/* Navigation Buttons (Back, Next, Submit) */}
      <div className="pt-6 border-t border-border/60 flex items-center justify-between">
        {currentPageIndex > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCurrentPageIndex((prev) => Math.max(0, prev - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="h-10 px-4 text-xs sm:text-sm font-semibold gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("Sebelumnya", "Previous")}</span>
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="submit"
          disabled={pending}
          className="h-10 px-6 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground shadow-sm gap-2"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{isLastPage ? t("Kirim Tanggapan", "Submit Response") : t("Selanjutnya", "Next")}</span>
          {!isLastPage && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
