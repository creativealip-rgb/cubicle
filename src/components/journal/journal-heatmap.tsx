import { Flame, Sparkles } from "lucide-react";

interface JournalHeatmapProps {
  entries: Array<{ createdAt: string | Date; mood?: string | null }>;
  t: (id: string, en: string) => string;
}

export function JournalHeatmap({ entries, t }: JournalHeatmapProps) {
  const today = new Date();
  const totalDays = 28; // 4 weeks
  const cells = [];

  // Map entries by local YYYY-MM-DD
  const dateToMoodMap = new Map<string, string>();
  for (const e of entries) {
    const d = new Date(e.createdAt);
    if (!isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dateToMoodMap.has(key) && e.mood) {
        dateToMoodMap.set(key, e.mood);
      }
    }
  }

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const mood = dateToMoodMap.get(key) || null;
    const isToday = i === 0;
    cells.push({ date: key, mood, isToday, dayNum: d.getDate() });
  }

  const writtenDays = dateToMoodMap.size;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {t("Matriks Refleksi & Mood (28 Hari)", "Reflection & Mood Matrix (28 Days)")}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {t("Pantau konsistensi dan energi harianmu", "Track your daily consistency & emotional energy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
          <Flame className="h-3.5 w-3.5 fill-amber-500" />
          <span>{writtenDays} {t("hari aktif", "active days")}</span>
        </div>
      </div>

      {/* Grid Heatmap */}
      <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
        {cells.map((cell) => {
          return (
            <div
              key={cell.date}
              title={`${cell.date}${cell.mood ? `: ${cell.mood}` : ` (${t("Belum ada entri", "No entry")})`}`}
              className={`group relative flex flex-col items-center justify-center h-10 rounded-xl border transition-all text-xs font-bold ${
                cell.mood
                  ? "border-violet-400/40 bg-violet-500/10 hover:border-violet-500 hover:scale-105"
                  : "border-border/50 bg-muted/20 hover:border-border"
              } ${cell.isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
            >
              {cell.mood ? (
                <span className="text-sm">{cell.mood}</span>
              ) : (
                <span className="text-[10px] font-mono text-muted-foreground/50">{cell.dayNum}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
