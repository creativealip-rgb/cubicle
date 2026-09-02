"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ListTodo,
  Loader2,
  Pin,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteNoteButton } from "@/components/notes/confirm-delete-note-button";
import { loadMorePersonalNotes } from "@/lib/actions/personal-notes";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";

export type NoteItem = {
  id: string;
  title: string;
  body: string | null;
  dueDate: string | null;
  recurrenceRule: string | null;
  notify7d: boolean;
  notify3d: boolean;
  notify1d: boolean;
  status: string;
  pinned: boolean;
  convertedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectOpt = { id: string; name: string };
type Tab = "open" | "done" | "archived" | "all";

const RECURRENCE_OPTIONS = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function formatDate(value: string | null, lang: string) {
  if (!value) return "";
  return new Date(value).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatRelativeDue(due: string | null, lang: string, t: (id: string, en: string) => string) {
  if (!due) return null;
  const now = new Date();
  const dueDate = new Date(due);
  if (isNaN(dueDate.getTime())) return null;

  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: overdueDays === 1 ? t("Lewat 1 hari", "1 day overdue") : t(`Lewat ${overdueDays} hari`, `${overdueDays} days overdue`),
      isOverdue: true,
      isDueSoon: false
    };
  }
  if (diffDays === 0) {
    return { text: t("Hari ini", "Today"), isOverdue: false, isDueSoon: true };
  }
  if (diffDays === 1) {
    return { text: t("Besok", "Tomorrow"), isOverdue: false, isDueSoon: true };
  }
  if (diffDays <= 7) {
    return { text: t(`${diffDays} hari lagi`, `In ${diffDays} days`), isOverdue: false, isDueSoon: true };
  }
  return {
    text: formatDate(due, lang),
    isOverdue: false,
    isDueSoon: false
  };
}

function recurrenceLabel(rule: string, t: (id: string, en: string) => string) {
  switch (rule) {
    case "daily":
      return t("Harian", "Daily");
    case "weekly":
      return t("Mingguan", "Weekly");
    case "monthly":
      return t("Bulanan", "Monthly");
    case "yearly":
      return t("Tahunan", "Yearly");
    default:
      return t("Tidak berulang", "Does not repeat");
  }
}

function priorityLabel(p: string, t: (id: string, en: string) => string) {
  switch (p) {
    case "low":
      return t("Rendah", "Low");
    case "high":
      return t("Tinggi", "High");
    case "urgent":
      return t("Mendesak", "Urgent");
    default:
      return t("Sedang", "Medium");
  }
}

export function NotesListClient({
  initialNotes,
  total,
  pageSize,
  tab,
  query,
  projects,
  lang,
  actions,
}: {
  initialNotes: NoteItem[];
  total: number;
  pageSize: number;
  tab: Tab;
  query: string;
  projects: ProjectOpt[];
  lang: string;
  actions: {
    setStatus: (formData: FormData) => Promise<void>;
    togglePinned: (formData: FormData) => Promise<void>;
    removeNote: (formData: FormData) => Promise<void>;
    updateNote: (formData: FormData) => Promise<void>;
    convertToTask: (formData: FormData) => Promise<void>;
  };
}) {
  const { t } = useT();
  const [notes, setNotes] = useState(initialNotes);
  const [offset, setOffset] = useState(initialNotes.length);
  const [hasMore, setHasMore] = useState(initialNotes.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setNotes(initialNotes);
    setOffset(initialNotes.length);
    setHasMore(initialNotes.length < total);
    setExpandedIds(new Set());
  }, [initialNotes, total, tab, query]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await loadMorePersonalNotes({
        query: query || undefined,
        status: tab,
        offset,
        limit: pageSize,
      });
      setNotes((prev) => {
        const ids = new Set(prev.map((n) => n.id));
        const merged = [...prev];
        for (const n of next) if (!ids.has(n.id)) merged.push(n);
        return merged;
      });
      const newOffset = offset + next.length;
      setOffset(newOffset);
      setHasMore(next.length === pageSize && newOffset < total);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, pageSize, query, tab, total]);

  const shownLabel = useMemo(() => {
    if (notes.length === 0) return t("0 tampil", "0 shown");
    return t(
      `1–${notes.length} dari ${total}`,
      `1–${notes.length} of ${total}`,
    );
  }, [notes.length, t, total]);

  if (notes.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{shownLabel}</p>
        <p className="py-8 text-center text-sm text-muted-foreground">
          {query
            ? t("Tidak ada catatan yang cocok.", "No matching notes.")
            : tab === "archived"
              ? t("Belum ada arsip.", "No archived notes yet.")
              : t("Belum ada catatan di tab ini.", "No notes in this tab.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-ui="todoist-note-list">
      <p className="px-1 pb-1 text-xs text-muted-foreground">{shownLabel}</p>
      {notes.map((note) => {
        const relDue = formatRelativeDue(note.dueDate, lang, t);
        const overdue = note.status === "open" && relDue?.isOverdue;
        const dueSoon = note.status === "open" && relDue?.isDueSoon;
        const rule = note.recurrenceRule || "none";
        const expanded = expandedIds.has(note.id);
        const bodyPreview =
          note.body && note.body.length > 160
            ? `${note.body.slice(0, 160).trimEnd()}…`
            : note.body;

        return (
          <div
            key={note.id}
            className={cn(
              "group relative rounded-2xl border border-transparent px-3 py-3 transition hover:border-border hover:bg-muted/30 sm:px-4",
              note.pinned && "border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20",
              overdue && "border-red-200/70 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20",
            )}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox Complete */}
              <form action={actions.setStatus} className="pt-0.5">
                <input type="hidden" name="noteId" value={note.id} />
                <input type="hidden" name="tab" value={tab} />
                <input type="hidden" name="q" value={query} />
                <input
                  type="hidden"
                  name="status"
                  value={note.status === "done" ? "open" : "done"}
                />
                <button
                  type="submit"
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                    note.status === "done"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-muted-foreground/50 hover:border-violet-600",
                  )}
                  aria-label={
                    note.status === "done"
                      ? t("Buka lagi", "Reopen")
                      : t("Tandai selesai", "Mark done")
                  }
                >
                  {note.status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : null}
                </button>
              </form>

              {/* Title & Meta Header */}
              <div
                className="min-w-0 flex-1 cursor-pointer space-y-1"
                onClick={() => toggleExpanded(note.id)}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpanded(note.id);
                  }
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={cn("text-sm font-semibold tracking-tight text-foreground", note.status === "done" && "line-through opacity-70")}>
                    {note.title}
                  </h3>
                  {overdue ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {relDue?.text || t("Terlambat", "Overdue")}
                    </Badge>
                  ) : dueSoon ? (
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] px-1.5 py-0">
                      {relDue?.text}
                    </Badge>
                  ) : null}
                  {note.pinned && (
                    <Badge variant="secondary" className="border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 text-[10px] px-1.5 py-0">
                      {t("Pinned", "Pinned")}
                    </Badge>
                  )}
                  {expanded && note.status === "done" ? (
                    <Badge className="bg-emerald-600 text-[10px] px-1.5 py-0">{t("Selesai", "Done")}</Badge>
                  ) : null}
                  {expanded && note.status === "archived" ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t("Arsip", "Archived")}</Badge>
                  ) : null}
                  {expanded && rule !== "none" ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{recurrenceLabel(rule, t)}</Badge>
                  ) : null}
                  {expanded && note.convertedTaskId ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {t("Jadi task", "Converted")}
                    </Badge>
                  ) : null}
                </div>

                {!expanded && bodyPreview ? (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {bodyPreview}
                  </p>
                ) : null}

                {!expanded && note.dueDate && !overdue && !dueSoon ? (
                  <p className="text-[11px] text-muted-foreground">
                    {t("Tenggat:", "Due:")} {formatDate(note.dueDate, lang)}
                  </p>
                ) : null}
              </div>

              {/* Quick Actions Buttons on Right */}
              <div className="flex shrink-0 items-center gap-1">
                <form action={actions.togglePinned}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="tab" value={tab} />
                  <input type="hidden" name="q" value={query} />
                  <input
                    type="hidden"
                    name="pinned"
                    value={note.pinned ? "false" : "true"}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 p-0 rounded-lg text-muted-foreground transition hover:text-foreground",
                      note.pinned && "text-amber-600 dark:text-amber-400"
                    )}
                    title={note.pinned ? t("Lepas sematan", "Unpin note") : t("Sematkan catatan", "Pin note")}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </Button>
                </form>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground transition hover:text-foreground"
                  onClick={() => toggleExpanded(note.id)}
                  title={expanded ? t("Tutup", "Collapse") : t("Buka detail", "Expand")}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Expanded Content Details */}
            {expanded ? (
              <div className="mt-3 space-y-3 border-t pt-3 pl-8">
                {note.body && (
                  <p className="whitespace-pre-wrap text-xs text-foreground/90 leading-relaxed">
                    {note.body}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <p>
                    {t("Diperbarui", "Updated")}: {formatDate(note.updatedAt, lang)}
                  </p>
                  {(note.notify7d || note.notify3d || note.notify1d) && (
                    <p>
                      • {t("Ingatkan", "Remind")}:{" "}
                      {[
                        note.notify7d && "7d",
                        note.notify3d && "3d",
                        note.notify1d && "1d",
                      ]
                        .filter(Boolean)
                        .join(" / ")}{" "}
                      {t("sebelum tenggat", "before due")}
                    </p>
                  )}
                  {note.convertedTaskId ? (
                    <p>
                      •{" "}
                      <Link
                        href={`/app/tasks?focus=${note.convertedTaskId}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("Buka task terkait", "Open linked task")}
                      </Link>
                    </p>
                  ) : null}
                </div>

                {/* Convert to Task Form */}
                {!note.convertedTaskId &&
                note.status !== "archived" &&
                projects.length > 0 ? (
                  <form
                    action={actions.convertToTask}
                    className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed p-3"
                  >
                    <input type="hidden" name="noteId" value={note.id} />
                    <div className="min-w-[140px] flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t("Jadikan task di project", "Convert to project task")}
                      </label>
                      <select
                        name="projectId"
                        required
                        defaultValue=""
                        className="flex h-9 w-full rounded-xl border border-input bg-background px-2 text-xs"
                      >
                        <option value="" disabled>
                          {t("Pilih project…", "Select project…")}
                        </option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-[120px] space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t("Prioritas", "Priority")}
                      </label>
                      <select
                        name="priority"
                        defaultValue="medium"
                        className="flex h-9 w-full rounded-xl border border-input bg-background px-2 text-xs"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {priorityLabel(p, t)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" size="sm" variant="secondary" className="rounded-xl text-xs">
                      <ListTodo className="h-3.5 w-3.5 mr-1" />
                      {t("Convert", "Convert")}
                    </Button>
                  </form>
                ) : null}

                {/* Edit Form Disclosure */}
                <details className="w-full">
                  <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                    {t("Ubah / Edit Catatan", "Edit Note")}
                  </summary>
                  <form
                    action={actions.updateNote}
                    className="mt-2 space-y-3 rounded-2xl border bg-muted/20 p-4"
                  >
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="tab" value={tab} />
                    <input type="hidden" name="q" value={query} />
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("Judul", "Title")}</label>
                      <Input
                        name="title"
                        defaultValue={note.title}
                        required
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("Isi Catatan", "Content")}</label>
                      <Textarea
                        name="body"
                        defaultValue={note.body || ""}
                        rows={4}
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t("Tenggat Waktu", "Due Date")}</label>
                        <Input
                          name="dueDate"
                          type="datetime-local"
                          defaultValue={formatDateTimeLocal(note.dueDate)}
                          className="rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t("Perulangan", "Recurrence")}</label>
                        <select
                          name="recurrenceRule"
                          defaultValue={note.recurrenceRule || "none"}
                          className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs"
                        >
                          {RECURRENCE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {recurrenceLabel(r, t)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
                        {t("Simpan", "Save")}
                      </Button>
                    </div>
                  </form>
                </details>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {note.status !== "done" ? (
                    <form action={actions.setStatus}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <input type="hidden" name="q" value={query} />
                      <input type="hidden" name="status" value="done" />
                      <Button type="submit" size="sm" variant="outline" className="h-8 gap-1 text-xs rounded-xl">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {t("Tandai Selesai", "Mark Done")}
                      </Button>
                    </form>
                  ) : (
                    <form action={actions.setStatus}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <input type="hidden" name="q" value={query} />
                      <input type="hidden" name="status" value="open" />
                      <Button type="submit" size="sm" variant="outline" className="h-8 gap-1 text-xs rounded-xl">
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t("Buka Lagi", "Reopen")}
                      </Button>
                    </form>
                  )}

                  {note.status !== "archived" ? (
                    <form action={actions.setStatus}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <input type="hidden" name="q" value={query} />
                      <input type="hidden" name="status" value="archived" />
                      <Button type="submit" size="sm" variant="ghost" className="h-8 gap-1 text-xs rounded-xl text-muted-foreground hover:text-foreground">
                        <Archive className="h-3.5 w-3.5" />
                        {t("Arsipkan", "Archive")}
                      </Button>
                    </form>
                  ) : null}

                  <ConfirmDeleteNoteButton
                    noteId={note.id}
                    tab={tab}
                    action={actions.removeNote}
                    label={t("Hapus", "Delete")}
                    confirmMessage={t(
                      "Hapus catatan ini permanen?",
                      "Delete this note permanently?",
                    )}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {hasMore ? (
        <div className="flex justify-center border-t pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => startTransition(() => void loadMore())}
            disabled={loadingMore || pending}
            className="rounded-xl"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                {t("Memuat…", "Loading…")}
              </>
            ) : (
              t("Muat lebih banyak", "Load more")
            )}
          </Button>
        </div>
      ) : notes.length > 0 ? (
        <p className="border-t pt-3 text-center text-xs text-muted-foreground">
          {t("Semua catatan dimuat", "All notes loaded")}
        </p>
      ) : null}
    </div>
  );
}
