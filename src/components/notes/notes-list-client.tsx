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

function isOverdue(due: string | null, status: string) {
  if (!due || status !== "open") return false;
  return new Date(due).getTime() < Date.now();
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

  // Explicit load-more keeps the compact list predictable and capped per batch.

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
    <div className="space-y-1" data-ui="todoist-note-list">
      <p className="px-1 pb-1 text-xs text-muted-foreground">{shownLabel}</p>
      {notes.map((note) => {
        const overdue = isOverdue(note.dueDate, note.status);
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
              "border-b px-1 py-2.5 last:border-b-0 sm:px-2",
              note.pinned && "bg-primary/[0.04]",
              overdue && "bg-destructive/[0.03]",
            )}
          >
            <div className="flex items-start gap-2">
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
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/50 hover:border-primary",
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
              <button
                type="button"
                className="min-w-0 flex-1 space-y-0.5 text-left"
                onClick={() => toggleExpanded(note.id)}
                aria-expanded={expanded}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{note.title}</h3>
                  {overdue ? (
                    <Badge variant="destructive">
                      {t("Terlambat", "Overdue")}
                    </Badge>
                  ) : null}
                  {note.pinned && expanded ? (
                    <Badge variant="secondary">
                      {t("Disematkan", "Pinned")}
                    </Badge>
                  ) : null}
                  {expanded && note.status === "done" ? (
                    <Badge>{t("Selesai", "Done")}</Badge>
                  ) : null}
                  {expanded && note.status === "archived" ? (
                    <Badge variant="outline">{t("Arsip", "Archived")}</Badge>
                  ) : null}
                  {expanded && rule !== "none" ? (
                    <Badge variant="outline">{recurrenceLabel(rule, t)}</Badge>
                  ) : null}
                  {expanded && note.convertedTaskId ? (
                    <Badge variant="secondary">
                      {t("Jadi task", "Converted")}
                    </Badge>
                  ) : null}
                </div>
                {!expanded && bodyPreview ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {bodyPreview}
                  </p>
                ) : null}
                {note.dueDate ? (
                  <p
                    className={cn(
                      "text-xs",
                      overdue
                        ? "font-medium text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {t("Tenggat", "Due")} {formatDate(note.dueDate, lang)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("Tanpa tenggat", "No due date")}
                  </p>
                )}
                {expanded ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t("Diperbarui", "Updated")}{" "}
                      {formatDate(note.updatedAt, lang)}
                    </p>
                    {(note.notify7d || note.notify3d || note.notify1d) && (
                      <p className="text-xs text-muted-foreground">
                        {t("Ingatkan", "Remind")}{" "}
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
                      <p className="text-xs">
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
                  </>
                ) : null}
              </button>
              <div className="flex flex-wrap justify-end gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleExpanded(note.id)}
                  aria-expanded={expanded}
                >
                  {expanded ? t("Tutup", "Collapse") : t("Buka", "Expand")}
                </Button>
                {expanded ? (
                  <>
                    <form action={actions.togglePinned}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <input type="hidden" name="q" value={query} />
                      <input
                        type="hidden"
                        name="pinned"
                        value={(!note.pinned).toString()}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        aria-label={t("Toggle pin", "Toggle pin")}
                      >
                        <Pin className="h-4 w-4" />
                      </Button>
                    </form>
                    {note.status !== "done" ? (
                      <form action={actions.setStatus}>
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <input type="hidden" name="q" value={query} />
                        <input type="hidden" name="status" value="done" />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          title={
                            rule !== "none"
                              ? t(
                                  "Selesai + majukan tenggat berikutnya",
                                  "Complete + advance next due",
                                )
                              : t("Tandai selesai", "Mark done")
                          }
                          aria-label={
                            rule !== "none"
                              ? t("Selesai & roll next", "Done & roll next")
                              : t("Tandai selesai", "Mark done")
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : (
                      <form action={actions.setStatus}>
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <input type="hidden" name="q" value={query} />
                        <input type="hidden" name="status" value="open" />
                        <Button type="submit" size="sm" variant="outline">
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t("Buka lagi", "Reopen")}
                        </Button>
                      </form>
                    )}
                    {note.status !== "archived" ? (
                      <form action={actions.setStatus}>
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <input type="hidden" name="q" value={query} />
                        <input type="hidden" name="status" value="archived" />
                        <Button type="submit" size="sm" variant="outline">
                          <Archive className="h-3.5 w-3.5" />
                          {t("Arsipkan", "Archive")}
                        </Button>
                      </form>
                    ) : (
                      <form action={actions.setStatus}>
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <input type="hidden" name="q" value={query} />
                        <input type="hidden" name="status" value="open" />
                        <Button type="submit" size="sm" variant="outline">
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t("Pulihkan", "Restore")}
                        </Button>
                      </form>
                    )}
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
                  </>
                ) : null}
              </div>
            </div>

            {expanded && note.body ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {note.body}
              </p>
            ) : null}

            {expanded ? (
              <>
                {!note.convertedTaskId &&
                note.status !== "archived" &&
                projects.length > 0 ? (
                  <form
                    action={actions.convertToTask}
                    className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3"
                  >
                    <input type="hidden" name="noteId" value={note.id} />
                    <div className="min-w-[140px] flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t(
                          "Jadikan task di project",
                          "Convert to project task",
                        )}
                      </label>
                      <select
                        name="projectId"
                        required
                        defaultValue=""
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
                    <div className="w-[130px] space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t("Prioritas", "Priority")}
                      </label>
                      <select
                        name="priority"
                        defaultValue="medium"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {priorityLabel(p, t)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                      {t("Buat task", "Create task")}
                    </Button>
                    <p className="w-full text-[11px] text-muted-foreground">
                      {t(
                        "Membuat task todo + arsipkan catatan + tautkan balik.",
                        "Creates a todo task + archives note + reverse-links.",
                      )}
                    </p>
                  </form>
                ) : null}

                <details className="rounded-md bg-muted/40 p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {t("Ubah", "Edit")}
                  </summary>
                  <form action={actions.updateNote} className="mt-3 space-y-3">
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="tab" value={tab} />
                    <input type="hidden" name="q" value={query} />
                    <Input
                      name="title"
                      defaultValue={note.title}
                      required
                      className="max-w-md"
                    />
                    <Textarea
                      name="body"
                      defaultValue={note.body ?? ""}
                      rows={4}
                    />
                    <Input
                      name="dueDate"
                      type="datetime-local"
                      defaultValue={formatDateTimeLocal(note.dueDate)}
                    />
                    <select
                      name="recurrenceRule"
                      defaultValue={
                        (RECURRENCE_OPTIONS as readonly string[]).includes(rule)
                          ? rule
                          : "none"
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {RECURRENCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {recurrenceLabel(opt, t)}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2 text-sm sm:max-w-md">
                      <label className="flex h-10 items-center gap-2 rounded-md border px-2.5 py-2">
                        <input
                          type="checkbox"
                          name="notify7d"
                          defaultChecked={note.notify7d}
                        />
                        7d
                      </label>
                      <label className="flex h-10 items-center gap-2 rounded-md border px-2.5 py-2">
                        <input
                          type="checkbox"
                          name="notify3d"
                          defaultChecked={note.notify3d}
                        />
                        3d
                      </label>
                      <label className="flex h-10 items-center gap-2 rounded-md border px-2.5 py-2">
                        <input
                          type="checkbox"
                          name="notify1d"
                          defaultChecked={note.notify1d}
                        />
                        1d
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="pinned"
                        defaultChecked={note.pinned}
                      />
                      {t("Sematkan catatan", "Pin note")}
                    </label>
                    <Button type="submit" size="sm">
                      {t("Simpan perubahan", "Save changes")}
                    </Button>
                  </form>
                </details>
              </>
            ) : note.body && note.body.length > 160 ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => toggleExpanded(note.id)}
              >
                {t("Baca selengkapnya", "Read more")}
              </button>
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
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
