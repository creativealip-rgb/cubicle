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
  Loader2,
  Pin,
  LayoutGrid,
  List as ListIcon,
  Search,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { ConfirmDeleteNoteButton } from "@/components/notes/confirm-delete-note-button";
import { NoteEditModal } from "@/components/notes/note-edit-modal";

type Tab = "open" | "done" | "archived" | "all";

export type NoteItem = {
  id: string;
  title: string;
  body: string | null;
  status: string;
  pinned: boolean;
  dueDate: string | Date | null;
  notify7d?: boolean;
  notify3d?: boolean;
  notify1d?: boolean;
  recurrenceRule?: string | null;
  reminderDays?: number[] | null;
  convertedTaskId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  completedAt?: string | Date | null;
};

// Distinct pastel border/bg style for sticky note feel
const NOTE_ACCENTS = [
  "border-violet-500/20 bg-gradient-to-b from-violet-500/[0.04] to-card",
  "border-sky-500/20 bg-gradient-to-b from-sky-500/[0.04] to-card",
  "border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-card",
  "border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-card",
  "border-pink-500/20 bg-gradient-to-b from-pink-500/[0.04] to-card",
];

function getNoteAccent(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return NOTE_ACCENTS[Math.abs(hash) % NOTE_ACCENTS.length];
}

function formatRelativeDue(
  dueDate: string | Date | null | undefined,
  lang: string,
  t: (id: string, en: string) => string,
) {
  if (!dueDate) return null;
  const target = new Date(dueDate);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: t(`${Math.abs(diffDays)}h lalu (Terlambat)`, `${Math.abs(diffDays)}d ago (Overdue)`),
      isOverdue: true,
      isDueSoon: false,
    };
  }
  if (diffDays === 0) {
    return {
      text: t("Hari ini", "Today"),
      isOverdue: false,
      isDueSoon: true,
    };
  }
  if (diffDays === 1) {
    return {
      text: t("Besok", "Tomorrow"),
      isOverdue: false,
      isDueSoon: true,
    };
  }
  if (diffDays <= 7) {
    return {
      text: t(`${diffDays} hari lagi`, `In ${diffDays} days`),
      isOverdue: false,
      isDueSoon: true,
    };
  }

  return {
    text: target.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
      month: "short",
      day: "numeric",
    }),
    isOverdue: false,
    isDueSoon: false,
  };
}

export function NotesListClient({
  initialNotes,
  total,
  pageSize,
  tab,
  query,
  projects: _projects = [],
  lang = "id",
  actions,
}: {
  initialNotes: NoteItem[];
  total: number;
  pageSize: number;
  tab: Tab;
  query: string;
  projects?: { id: string; name: string }[];
  lang?: string;
  actions: {
    setStatus: (formData: FormData) => Promise<void>;
    togglePinned: (formData: FormData) => Promise<void>;
    removeNote: (formData: FormData) => Promise<void>;
    updateNote: (formData: FormData) => Promise<void>;
    convertToTask: (formData: FormData) => Promise<void>;
  };
}) {
  const { t } = useT();
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [localSearch, setLocalSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setNotes(initialNotes);
    setPage(1);
  }, [initialNotes]);

  const filteredNotes = useMemo(() => {
    if (!localSearch.trim()) return notes;
    const q = localSearch.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.body && n.body.toLowerCase().includes(q)),
    );
  }, [notes, localSearch]);

  const hasMore = notes.length < total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/personal-notes?tab=${tab}&q=${encodeURIComponent(query)}&page=${nextPage}&pageSize=${pageSize}`,
      );
      if (!res.ok) throw new Error("Gagal memuat catatan berikutnya");
      const data = (await res.json()) as { items?: NoteItem[] };
      const nextItems = Array.isArray(data.items) ? data.items : [];
      if (nextItems.length > 0) {
        setNotes((prev) => [...prev, ...nextItems]);
        setPage(nextPage);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, pageSize, query, tab]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.pinned), [filteredNotes]);
  const regularNotes = useMemo(() => filteredNotes.filter((n) => !n.pinned), [filteredNotes]);

  const renderNoteCard = (note: NoteItem) => {
    const relDue = formatRelativeDue(note.dueDate, lang, t);
    const overdue = note.status === "open" && relDue?.isOverdue;
    const dueSoon = note.status === "open" && relDue?.isDueSoon;
    const accentClass = getNoteAccent(note.id);

    return (
      <div
        key={note.id}
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all hover:shadow-xs",
          accentClass,
          note.pinned && "border-amber-400/80 bg-amber-500/[0.06] ring-1 ring-amber-400/40",
          overdue && "border-rose-400/80 bg-rose-500/[0.06]",
          note.status === "done" && "opacity-75 bg-muted/20 border-border/60",
        )}
      >
        <div>
          {/* Card Top: Checkbox, Title, Pin */}
          <div className="flex items-start justify-between gap-2.5">
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
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-all cursor-pointer",
                    note.status === "done"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-muted-foreground/40 bg-background hover:border-primary",
                  )}
                  aria-label={note.status === "done" ? t("Buka lagi", "Reopen") : t("Tandai selesai", "Mark done")}
                >
                  {note.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                </button>
              </form>

              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "text-sm font-bold tracking-tight text-foreground leading-snug break-words",
                    note.status === "done" && "line-through text-muted-foreground font-normal",
                  )}
                >
                  {note.title}
                </h3>
                {overdue ? (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1.5 font-bold rounded-md">
                    {relDue?.text || t("Terlambat", "Overdue")}
                  </Badge>
                ) : dueSoon ? (
                  <Badge variant="outline" className="border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] px-1.5 py-0 mt-1.5 font-bold rounded-md">
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
                  "rounded-lg p-1 text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer",
                  note.pinned && "text-amber-600 dark:text-amber-400",
                )}
                title={note.pinned ? t("Lepas pin", "Unpin") : t("Sematkan", "Pin")}
              >
                <Pin className={cn("h-4 w-4", note.pinned && "fill-amber-500")} />
              </button>
            </form>
          </div>

          {/* Body Content */}
          {note.body ? (
            <div className="mt-3 text-xs text-muted-foreground/90 whitespace-pre-wrap line-clamp-4 leading-relaxed font-sans">
              {note.body}
            </div>
          ) : null}
        </div>

        {/* Card Bottom Meta & Actions */}
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            {note.dueDate && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-foreground/80 font-medium">
                <Clock className="h-3 w-3 text-primary" />
                {new Date(note.dueDate).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <NoteEditModal
              note={note}
              tab={tab}
              query={query}
              lang={lang}
              action={actions.updateNote}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" data-ui="todoist-note-list">
      {/* Interactive Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t(
              "Filter catatan langsung (judul atau isi)...",
              "Quick filter notes by title or body...",
            )}
            className="h-9 rounded-xl pl-9 text-xs"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="font-mono text-xs text-muted-foreground">
            {filteredNotes.length} {t("catatan", "notes")}
          </span>

          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setViewMode("grid")}
              title={t("Tampilan Grid", "Grid view")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setViewMode("list")}
              title={t("Tampilan List", "List view")}
            >
              <ListIcon className="h-3.5 w-3.5" />
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
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Pin className="h-3.5 w-3.5 fill-amber-500" />
                <span>{t("Disematkan", "Pinned Notes")} ({pinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {pinnedNotes.map(renderNoteCard)}
              </div>
            </div>
          )}

          {/* Regular Notes Section */}
          <div className="space-y-2.5">
            {pinnedNotes.length > 0 && (
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>{t("Lainnya", "Others")} ({regularNotes.length})</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {regularNotes.map(renderNoteCard)}
            </div>
          </div>
        </div>
      ) : (
        /* List Mode View */
        <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          {filteredNotes.map((note) => {
            const relDue = formatRelativeDue(note.dueDate, lang, t);
            return (
              <div
                key={note.id}
                className={cn(
                  "flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/30",
                  note.pinned && "bg-amber-500/[0.02]",
                  note.status === "done" && "opacity-75 bg-muted/10",
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <form action={actions.setStatus} className="shrink-0">
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
                        "flex h-5 w-5 items-center justify-center rounded-full border cursor-pointer",
                        note.status === "done"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-muted-foreground/40 hover:border-primary",
                      )}
                    >
                      {note.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    </button>
                  </form>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold text-foreground truncate", note.status === "done" && "line-through text-muted-foreground font-normal")}>
                        {note.title}
                      </span>
                      {note.pinned && <Pin className="h-3 w-3 fill-amber-500 text-amber-600 shrink-0" />}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {relDue && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {relDue.text}
                    </span>
                  )}
                  <ConfirmDeleteNoteButton
                    noteId={note.id}
                    tab={tab}
                    action={actions.removeNote}
                    label={t("Hapus", "Delete")}
                    confirmMessage={t("Hapus catatan ini?", "Delete this note?")}
                  />
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
