"use client";

import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMPTS = {
  id: [
    "Apa satu pencapaian atau kemenangan pentingmu hari ini?",
    "Pelajaran apa yang paling berharga yang kamu dapatkan minggu ini?",
    "Apa hal yang paling kamu syukuri saat ini di workspace-mu?",
    "Bagaimana energimu hari ini, dan apa yang bisa kamu tingkatkan besok?",
    "Tantangan apa yang berhasil kamu lewati hari ini?",
  ],
  en: [
    "What was your single most important win or milestone today?",
    "What valuable lesson did you learn or discover this week?",
    "What are you most grateful for in your workspace right now?",
    "How was your energy today, and how can you reset for tomorrow?",
    "What challenging hurdle did you overcome today?",
  ],
};

export function JournalInspirationBanner({
  lang,
  localDate,
}: {
  lang: string;
  localDate: string;
}) {
  const isId = lang !== "en";
  const t = (id: string, en: string) => isId ? id : en;
  const promptList = isId ? PROMPTS.id : PROMPTS.en;
  const dayOfYear = localDate.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const selectedPrompt = promptList[dayOfYear % promptList.length];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <PenLine className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {t("Inspirasi Refleksi Hari Ini", "Today's Reflection Prompt")}
            </span>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {selectedPrompt}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => window.dispatchEvent(new CustomEvent("journal:write-reflection", { detail: selectedPrompt }))}>
          <PenLine className="mr-1.5 size-3.5" />
          {t("Tulis refleksi", "Write a reflection")}
        </Button>
      </div>
    </div>
  );
}
