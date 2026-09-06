import { Sparkles } from "lucide-react";

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
  t,
  lang,
}: {
  t: (id: string, en: string) => string;
  lang: string;
}) {
  const isId = lang !== "en";
  const promptList = isId ? PROMPTS.id : PROMPTS.en;
  // Pick prompt based on today's date
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const selectedPrompt = promptList[dayOfYear % promptList.length];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.07] via-violet-500/[0.04] to-transparent p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {t("Inspirasi Refleksi Hari Ini", "Today's Reflection Prompt")}
            </span>
            <p className="mt-0.5 text-sm font-semibold text-foreground italic">
              &ldquo;{selectedPrompt}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
