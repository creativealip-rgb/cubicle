import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createPersonalNote,
  deletePersonalNote,
  listPersonalNotes,
  togglePersonalNotePinned,
  updatePersonalNote,
  updatePersonalNoteStatus,
  type PersonalNoteRecurrence,
  type PersonalNoteStatus,
} from "@/lib/actions/personal-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Archive, CheckCircle2, Pin, RotateCcw } from "lucide-react";
import { getCurrentLang, createT, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ConfirmDeleteNoteButton } from "@/components/notes/confirm-delete-note-button";

type Tab = "open" | "done" | "archived" | "all";

const RECURRENCE_OPTIONS: PersonalNoteRecurrence[] = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

function formatDate(value: Date | string, lang: Lang) {
  return new Date(value).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateTimeLocal(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function isOverdue(due: Date | string | null, status: string) {
  if (!due || status !== "open") return false;
  return new Date(due).getTime() < Date.now();
}

function recurrenceLabel(
  rule: string,
  t: (id: string, en: string) => string,
) {
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

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const tab = (["open", "done", "archived", "all"].includes(params.tab ?? "")
    ? params.tab
    : "open") as Tab;

  const allNotes = await listPersonalNotes(query, {
    status: "all",
    includeSystem: false,
  });

  const counts = {
    open: allNotes.filter((n) => n.status === "open").length,
    done: allNotes.filter((n) => n.status === "done").length,
    archived: allNotes.filter((n) => n.status === "archived").length,
    all: allNotes.length,
  };

  const notes =
    tab === "all" ? allNotes : allNotes.filter((n) => n.status === tab);

  async function createNote(formData: FormData) {
    "use server";
    await createPersonalNote({
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? "") || undefined,
      dueDate: String(formData.get("dueDate") ?? "") || undefined,
      recurrenceRule: (String(formData.get("recurrenceRule") ?? "none") ||
        "none") as PersonalNoteRecurrence,
      notify7d: formData.get("notify7d") === "on",
      notify3d: formData.get("notify3d") === "on",
      notify1d: formData.get("notify1d") === "on",
      pinned: formData.get("pinned") === "on",
    });
    redirect("/app/personal?tab=open");
  }

  async function updateNote(formData: FormData) {
    "use server";
    await updatePersonalNote(String(formData.get("noteId") ?? ""), {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? "") || undefined,
      dueDate: String(formData.get("dueDate") ?? "") || undefined,
      recurrenceRule: (String(formData.get("recurrenceRule") ?? "none") ||
        "none") as PersonalNoteRecurrence,
      notify7d: formData.get("notify7d") === "on",
      notify3d: formData.get("notify3d") === "on",
      notify1d: formData.get("notify1d") === "on",
      pinned: formData.get("pinned") === "on",
    });
    const back = String(formData.get("tab") ?? "open");
    redirect(`/app/personal?tab=${back}`);
  }

  async function setStatus(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(
      String(formData.get("noteId") ?? ""),
      String(formData.get("status") ?? "open") as PersonalNoteStatus,
    );
    const back = String(formData.get("tab") ?? "open");
    redirect(`/app/personal?tab=${back}`);
  }

  async function togglePinned(formData: FormData) {
    "use server";
    await togglePersonalNotePinned(
      String(formData.get("noteId") ?? ""),
      String(formData.get("pinned") ?? "false") === "true",
    );
    const back = String(formData.get("tab") ?? "open");
    redirect(`/app/personal?tab=${back}`);
  }

  async function removeNote(formData: FormData) {
    "use server";
    await deletePersonalNote(String(formData.get("noteId") ?? ""));
    const back = String(formData.get("tab") ?? "open");
    redirect(`/app/personal?tab=${back}`);
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "open", label: t("Aktif", "Open"), count: counts.open },
    { id: "done", label: t("Selesai", "Done"), count: counts.done },
    { id: "archived", label: t("Arsip", "Archived"), count: counts.archived },
    { id: "all", label: t("Semua", "All"), count: counts.all },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("Catatan", "Notes")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Catatan pribadi di workspace ini. Tidak tampil ke client.",
            "Private notes in this workspace. Hidden from clients.",
          )}
        </p>
      </div>

      <form action="/app/personal" className="flex flex-wrap gap-2">
        <input type="hidden" name="tab" value={tab} />
        <Input
          name="q"
          placeholder={t("Cari catatan…", "Search notes…")}
          defaultValue={query}
          className="min-w-[200px] flex-1"
        />
        <Button type="submit" variant="outline">
          {t("Cari", "Search")}
        </Button>
        {query ? (
          <Button type="button" variant="ghost" asChild>
            <Link href={`/app/personal?tab=${tab}`}>{t("Reset", "Clear")}</Link>
          </Button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            asChild
            size="sm"
            variant={tab === item.id ? "default" : "outline"}
          >
            <Link
              href={`/app/personal?tab=${item.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            >
              {item.label}
              <span className="ml-1.5 tabular-nums opacity-80">{item.count}</span>
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("Catatan baru", "New note")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createNote} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  {t("Judul", "Title")}
                </label>
                <Input
                  id="title"
                  name="title"
                  placeholder={t("Follow up client…", "Follow up client…")}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="body" className="text-sm font-medium">
                  {t("Isi", "Body")}
                </label>
                <Textarea
                  id="body"
                  name="body"
                  rows={6}
                  placeholder={t(
                    "Catatan, ide, reminder personal…",
                    "Notes, ideas, personal reminders…",
                  )}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dueDate" className="text-sm font-medium">
                  {t("Tenggat", "Due date")}
                </label>
                <Input id="dueDate" name="dueDate" type="datetime-local" />
              </div>
              <div className="space-y-2">
                <label htmlFor="recurrenceRule" className="text-sm font-medium">
                  {t("Pengulangan", "Recurrence")}
                </label>
                <select
                  id="recurrenceRule"
                  name="recurrenceRule"
                  defaultValue="none"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {recurrenceLabel(opt, t)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Label saja — auto-roll due date belum aktif.",
                    "Label only — auto-roll due date not yet active.",
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("Ingatkan (hari sebelum tenggat)", "Remind (days before due)")}
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <label className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <input type="checkbox" name="notify7d" />
                    7d
                  </label>
                  <label className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <input type="checkbox" name="notify3d" />
                    3d
                  </label>
                  <label className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <input type="checkbox" name="notify1d" />
                    1d
                  </label>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pinned" />
                {t("Sematkan catatan", "Pin note")}
              </label>
              <Button type="submit" className="w-full">
                {t("Buat catatan", "Create note")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{t("Daftar catatan", "Note list")}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {notes.length} {t("tampil", "shown")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {query
                  ? t("Tidak ada catatan yang cocok.", "No matching notes.")
                  : tab === "archived"
                    ? t("Belum ada arsip.", "No archived notes yet.")
                    : t("Belum ada catatan di tab ini.", "No notes in this tab.")}
              </p>
            ) : (
              notes.map((note) => {
                const overdue = isOverdue(note.dueDate, note.status);
                return (
                  <div
                    key={note.id}
                    className={cn(
                      "space-y-3 rounded-lg border p-4",
                      note.pinned && "border-primary/40 bg-primary/5",
                      overdue && "border-destructive/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{note.title}</h3>
                          {note.pinned ? (
                            <Badge variant="secondary">{t("Disematkan", "Pinned")}</Badge>
                          ) : null}
                          {note.status === "done" ? (
                            <Badge>{t("Selesai", "Done")}</Badge>
                          ) : null}
                          {note.status === "archived" ? (
                            <Badge variant="outline">{t("Arsip", "Archived")}</Badge>
                          ) : null}
                          {overdue ? (
                            <Badge variant="destructive">{t("Terlambat", "Overdue")}</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("Diperbarui", "Updated")} {formatDate(note.updatedAt, lang)}
                        </p>
                        {note.dueDate ? (
                          <p
                            className={cn(
                              "text-xs",
                              overdue ? "font-medium text-destructive" : "text-muted-foreground",
                            )}
                          >
                            {t("Tenggat", "Due")} {formatDate(note.dueDate, lang)}
                            {" · "}
                            {recurrenceLabel(note.recurrenceRule || "none", t)}
                          </p>
                        ) : null}
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
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <form action={togglePinned}>
                          <input type="hidden" name="noteId" value={note.id} />
                          <input type="hidden" name="tab" value={tab} />
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
                          <form action={setStatus}>
                            <input type="hidden" name="noteId" value={note.id} />
                            <input type="hidden" name="tab" value={tab} />
                            <input type="hidden" name="status" value="done" />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              aria-label={t("Tandai selesai", "Mark done")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </form>
                        ) : (
                          <form action={setStatus}>
                            <input type="hidden" name="noteId" value={note.id} />
                            <input type="hidden" name="tab" value={tab} />
                            <input type="hidden" name="status" value="open" />
                            <Button type="submit" size="sm" variant="outline">
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              {t("Buka lagi", "Reopen")}
                            </Button>
                          </form>
                        )}
                        {note.status !== "archived" ? (
                          <form action={setStatus}>
                            <input type="hidden" name="noteId" value={note.id} />
                            <input type="hidden" name="tab" value={tab} />
                            <input type="hidden" name="status" value="archived" />
                            <Button type="submit" size="sm" variant="outline">
                              <Archive className="mr-1 h-3.5 w-3.5" />
                              {t("Arsipkan", "Archive")}
                            </Button>
                          </form>
                        ) : (
                          <form action={setStatus}>
                            <input type="hidden" name="noteId" value={note.id} />
                            <input type="hidden" name="tab" value={tab} />
                            <input type="hidden" name="status" value="open" />
                            <Button type="submit" size="sm" variant="outline">
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              {t("Pulihkan", "Restore")}
                            </Button>
                          </form>
                        )}
                        <ConfirmDeleteNoteButton
                          noteId={note.id}
                          tab={tab}
                          action={removeNote}
                          label={t("Hapus", "Delete")}
                          confirmMessage={t(
                            "Hapus catatan ini permanen?",
                            "Delete this note permanently?",
                          )}
                        />
                      </div>
                    </div>
                    {note.body ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {note.body}
                      </p>
                    ) : null}
                    <details className="rounded-md bg-muted/40 p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        {t("Ubah", "Edit")}
                      </summary>
                      <form action={updateNote} className="mt-3 space-y-3">
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <Input name="title" defaultValue={note.title} required />
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
                            RECURRENCE_OPTIONS.includes(
                              (note.recurrenceRule || "none") as PersonalNoteRecurrence,
                            )
                              ? note.recurrenceRule || "none"
                              : "none"
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {RECURRENCE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {recurrenceLabel(opt, t)}
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <label className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                            <input
                              type="checkbox"
                              name="notify7d"
                              defaultChecked={note.notify7d}
                            />
                            7d
                          </label>
                          <label className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                            <input
                              type="checkbox"
                              name="notify3d"
                              defaultChecked={note.notify3d}
                            />
                            3d
                          </label>
                          <label className="flex items-center gap-2 rounded-md border px-2 py-1.5">
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
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
