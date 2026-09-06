"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pin,
  LayoutGrid,
  List as ListIcon,
  Search,
  Clock,
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    setNotes(initialNotes);
    setOffset(initialNotes.length);
    setHasMore(initialNotes.length < total);
    setExpandedIds(new Set());
  }, [initialNotes, total, tab, query]);

  const filteredNotes = useMemo(() => {
    if (!localSearch.trim()) return notes;
    const q = localSearch.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.body && n.body.toLowerCase().includes(q)),
    );
  }, [notes, localSearch]);

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
    if (filteredNotes.length === 0) return t("0 tampil", "0 shown");
    return t(
      `1–${filteredNotes.length} dari ${total}`,
      `1–${filteredNotes.length} of ${total}`,
    );
  }, [filteredNotes.length, t, total]);

  return (
    <div className="space-y-4" data-ui="todoist-note-list">
      {/* Interactive Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t("Filter cepat judul atau isi catatan...", "Quick filter by title or body...")}
            className="h-9 rounded-xl pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground px-1">{shownLabel}</span>
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode("grid")}
              title={t("Tampilan Kartu Grid", "Grid view")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode("list")}
              title={t("Tampilan List", "List view")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-12 text-center shadow-2xs">
          <p className="text-sm font-semibold text-foreground">
            {localSearch || query
              ? t("Tidak ada catatan yang cocok.", "No matching notes.")
              : tab === "archived"
                ? t("Belum ada arsip catatan.", "No archived notes yet.")
                : t("Belum ada catatan di tab ini.", "No notes in this tab.")}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Sticky-Note Cards Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredNotes.map((note) => {
            const relDue = formatRelativeDue(note.dueDate, lang, t);
            const overdue = note.status === "open" && relDue?.isOverdue;
            const dueSoon = note.status === "open" && relDue?.isDueSoon;
            const expanded = expandedIds.has(note.id);
            const rule = note.recurrenceRule || "none";

            return (
              <div
                key={note.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs",
                  note.pinned && "border-amber-400/60 bg-amber-500/[0.03] ring-1 ring-amber-400/30",
                  overdue && "border-rose-400/60 bg-rose-500/[0.03]",
                  note.status === "done" && "opacity-75 bg-muted/20",
                )}
              >
                <div>
                  {/* Top Bar on Card: Checkbox + Title + Pin */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <form action={actions.setStatus} className="pt-0.5 shrink-0">
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
                              : "border-muted-foreground/50 hover:border-primary",
                          )}
                          aria-label={note.status === "done" ? t("Buka lagi", "Reopen") : t("Tandai selesai", "Mark done")}
                        >
                          {note.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                        </button>
                      </form>

                      <div className="min-w-0 flex-1">
                        <h3 className={cn("text-sm font-bold tracking-tight text-foreground leading-snug break-words", note.status === "done" && "line-through text-muted-foreground")}>
                          {note.title}
                        </h3>
                        {overdue ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1 font-bold">
                            {relDue?.text || t("Terlambat", "Overdue")}
                          </Badge>
                        ) : dueSoon ? (
                          <Badge variant="outline" className="border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] px-1.5 py-0 mt-1 font-bold">
                            {relDue?.text}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <form action={actions.togglePinned} className="shrink-0">
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <input type="hidden" name="q" value={query} />
                      <button
                        type="submit"
                        className={cn(
                          "rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors",
                          note.pinned && "text-amber-600 dark:text-amber-400",
                        )}
                        title={note.pinned ? t("Lepas pin", "Unpin") : t("Sematkan", "Pin")}
                      >
                        <Pin className={cn("h-4 w-4", note.pinned && "fill-amber-500")} />
                      </button>
                    </form>
                  </div>

                  {/* Body preview */}
                  {note.body ? (
                    <div className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 leading-relaxed">
                      {note.body}
                    </div>
                  ) : null}
                </div>

                {/* Card Footer: Metadata + Quick Action Buttons */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 truncate">
                    {note.dueDate && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.dueDate, lang).split(",")[0]}
                      </span>
                    )}
                    {note.convertedTaskId && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 h-4 font-bold">
                        {t("Terkait Proyek", "Linked Task")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] rounded-lg font-semibold"
                      onClick={() => toggleExpanded(note.id)}
                    >
                      {expanded ? t("Tutup", "Close") : t("Edit / Aksi", "Edit / Action")}
                    </Button>
                  </div>
                </div>

                {/* Inline Expand Editor for full controls */}
                {expanded && (
                  <div className="mt-3 pt-3 border-t border-border/80 space-y-3 bg-muted/20 p-3 rounded-xl">
                    <form action={actions.updateNote} className="space-y-2.5">
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <input type="hidden" name="q" value={query} />
                      <Input
                        name="title"
                        defaultValue={note.title}
                        required
                        className="h-8 text-xs font-semibold rounded-lg"
                      />
                      <Textarea
                        name="body"
                        defaultValue={note.body || ""}
                        rows={3}
                        className="text-xs rounded-lg"
                        placeholder={t("Isi catatan...", "Note content...")}
                      />
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button type="submit" size="sm" className="h-7 text-xs rounded-lg font-semibold bg-primary text-white">
                          {t("Simpan", "Save")}
                        </Button>
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
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Traditional List / Table View */
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
          {filteredNotes.map((note) => {
            const relDue = formatRelativeDue(note.dueDate, lang, t);
            const overdue = note.status === "open" && relDue?.isOverdue;
            const dueSoon = note.status === "open" && relDue?.isDueSoon;
            const expanded = expandedIds.has(note.id);

            return (
              <div
                key={note.id}
                className={cn(
                  "group relative px-4 py-3 transition hover:bg-muted/30 flex items-start gap-3",
                  note.pinned && "bg-amber-500/[0.02]",
                )}
              >
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
                        : "border-muted-foreground/50 hover:border-primary",
                    )}
                  >
                    {note.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </button>
                </form>

                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleExpanded(note.id)}>
                  <div className="flex items-center gap-2">
                    <h3 className={cn("text-sm font-semibold text-foreground", note.status === "done" && "line-through text-muted-foreground")}>
                      {note.title}
                    </h3>
                    {note.pinned && <Pin className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
                    {overdue && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                        {relDue?.text || t("Terlambat", "Overdue")}
                      </Badge>
                    )}
                  </div>
                  {note.body && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{note.body}</p>}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs rounded-lg"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTransition(() => void loadMore())}
            disabled={loadingMore || pending}
            className="rounded-xl"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {t("Muat Lebih Banyak", "Load More")}
          </Button>
        </div>
      )}
    </div>
  );
}
