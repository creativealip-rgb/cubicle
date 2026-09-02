export type NoteSummaryInput = {
  id: string;
  dueDate: string | Date | null;
  status: string;
  pinned: boolean;
};

export type NoteCountsInput = {
  open: number;
  done: number;
  archived: number;
  all: number;
};

export function calculateNotesSummary(
  notes: NoteSummaryInput[],
  counts: NoteCountsInput,
  referenceDate: Date = new Date()
) {
  const nowMs = referenceDate.getTime();
  const sevenDaysLaterMs = nowMs + 7 * 24 * 60 * 60 * 1000;

  let dueSoon = 0;
  let pinned = 0;

  for (const n of notes) {
    if (n.pinned && n.status !== "archived") {
      pinned++;
    }
    if (n.status === "open" && n.dueDate) {
      const dueMs = new Date(n.dueDate).getTime();
      if (!isNaN(dueMs) && dueMs >= nowMs && dueMs <= sevenDaysLaterMs) {
        dueSoon++;
      }
    }
  }

  return {
    open: counts.open,
    done: counts.done,
    archived: counts.archived,
    all: counts.all,
    dueSoon,
    pinned,
  };
}
