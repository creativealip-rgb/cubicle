export type JournalSummaryEntry = {
  id: string;
  createdAt: string | Date;
  mood?: string | null;
  status: string;
};

export function calculateJournalSummary(
  entries: JournalSummaryEntry[],
  totalEntries: number,
  referenceDate: Date = new Date()
) {
  const activeEntries = entries.filter((e) => e.status !== "archived");
  
  // Hitung entri 7 hari terakhir
  const nowMs = referenceDate.getTime();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  
  let thisWeek = 0;
  const moodCounts: Record<string, number> = {};

  for (const e of activeEntries) {
    const createdMs = new Date(e.createdAt).getTime();
    if (!isNaN(createdMs) && createdMs >= sevenDaysAgoMs && createdMs <= nowMs) {
      thisWeek++;
    }
    if (e.mood) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }
  }

  // Cari top mood
  let topMood: string | null = null;
  let maxMoodCount = 0;
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxMoodCount) {
      maxMoodCount = count;
      topMood = mood;
    }
  }

  // Hitung streak harian dari entri yang dimuat
  const uniqueDates = Array.from(
    new Set(
      activeEntries.map((e) => {
        const d = new Date(e.createdAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
    )
  ).sort().reverse();

  let streak = 0;
  if (uniqueDates.length > 0) {
    const todayStr = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}-${String(referenceDate.getDate()).padStart(2, "0")}`;
    const yesterdayDate = new Date(referenceDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

    let checkDate = new Date(referenceDate);
    // Jika hari ini belum nulis tapi kemarin nulis, mulai streak dari kemarin
    if (!uniqueDates.includes(todayStr) && uniqueDates.includes(yesterdayStr)) {
      checkDate = yesterdayDate;
    }

    while (true) {
      const curStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      if (uniqueDates.includes(curStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    thisWeek,
    currentStreak: streak,
    topMood,
    totalEntries,
    scope: "loaded-page" as const,
  };
}
