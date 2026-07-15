import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  convertPersonalNoteToTask,
  countPersonalNotesByStatus,
  createPersonalNote,
  deletePersonalNote,
  getNotesPageSize,
  listPersonalNotes,
  togglePersonalNotePinned,
  updatePersonalNote,
  updatePersonalNoteStatus,
  type PersonalNoteRecurrence,
  type PersonalNoteStatus,
} from "@/lib/actions/personal-notes";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentLang, createT } from "@/lib/i18n";
import {
  NotesListClient,
  type NoteItem,
} from "@/components/notes/notes-list-client";

type Tab = "open" | "done" | "archived" | "all";

const RECURRENCE_OPTIONS: PersonalNoteRecurrence[] = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

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

function buildHref(tab: Tab, query: string) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (query) params.set("q", query);
  return `/app/personal?${params.toString()}`;
}

function toNoteItem(note: {
  id: string;
  title: string;
  body: string | null;
  dueDate: Date | null;
  recurrenceRule: string | null;
  notify7d: boolean;
  notify3d: boolean;
  notify1d: boolean;
  status: string;
  pinned: boolean;
  convertedTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NoteItem {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    dueDate: note.dueDate ? note.dueDate.toISOString() : null,
    recurrenceRule: note.recurrenceRule,
    notify7d: note.notify7d,
    notify3d: note.notify3d,
    notify1d: note.notify1d,
    status: note.status,
    pinned: note.pinned,
    convertedTaskId: note.convertedTaskId,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
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
  const pageSize = await getNotesPageSize();

  const workspaceId = await getWorkspaceForCurrentUser();
  const [counts, notes, projectList] = await Promise.all([
    countPersonalNotesByStatus(query, { includeSystem: false }),
    listPersonalNotes(query, {
      status: tab === "all" ? "all" : tab,
      includeSystem: false,
      limit: pageSize,
      offset: 0,
    }),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, "active")))
      .orderBy(projects.name)
      .limit(100),
  ]);

  const tabTotal =
    tab === "all"
      ? counts.all
      : tab === "open"
        ? counts.open
        : tab === "done"
          ? counts.done
          : counts.archived;

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
    const q = String(formData.get("q") ?? "");
    const params = new URLSearchParams({ tab: back });
    if (q) params.set("q", q);
    redirect(`/app/personal?${params.toString()}`);
  }

  async function setStatus(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(
      String(formData.get("noteId") ?? ""),
      String(formData.get("status") ?? "open") as PersonalNoteStatus,
    );
    const back = String(formData.get("tab") ?? "open");
    const q = String(formData.get("q") ?? "");
    const params = new URLSearchParams({ tab: back });
    if (q) params.set("q", q);
    redirect(`/app/personal?${params.toString()}`);
  }

  async function togglePinned(formData: FormData) {
    "use server";
    await togglePersonalNotePinned(
      String(formData.get("noteId") ?? ""),
      String(formData.get("pinned") ?? "false") === "true",
    );
    const back = String(formData.get("tab") ?? "open");
    const q = String(formData.get("q") ?? "");
    const params = new URLSearchParams({ tab: back });
    if (q) params.set("q", q);
    redirect(`/app/personal?${params.toString()}`);
  }

  async function removeNote(formData: FormData) {
    "use server";
    await deletePersonalNote(String(formData.get("noteId") ?? ""));
    const back = String(formData.get("tab") ?? "open");
    const q = String(formData.get("q") ?? "");
    const params = new URLSearchParams({ tab: back });
    if (q) params.set("q", q);
    redirect(`/app/personal?${params.toString()}`);
  }

  async function convertToTask(formData: FormData) {
    "use server";
    const noteId = String(formData.get("noteId") ?? "");
    const projectId = String(formData.get("projectId") ?? "");
    const priority = String(formData.get("priority") ?? "medium");
    const task = await convertPersonalNoteToTask(noteId, projectId, {
      priority,
      archiveNote: true,
    });
    redirect(`/app/tasks?focus=${task.id}`);
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
            <Link href={buildHref(tab, "")}>{t("Reset", "Clear")}</Link>
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
            <Link href={buildHref(item.id, query)}>
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
                    "Saat selesai / lewat tenggat: due date auto-maju ke periode berikutnya.",
                    "On done / past due: due date auto-advances to the next period.",
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
            <CardTitle>{t("Daftar catatan", "Note list")}</CardTitle>
          </CardHeader>
          <CardContent>
            <NotesListClient
              initialNotes={notes.map(toNoteItem)}
              total={tabTotal}
              pageSize={pageSize}
              tab={tab}
              query={query}
              projects={projectList}
              lang={lang}
              actions={{
                setStatus,
                togglePinned,
                removeNote,
                updateNote,
                convertToTask,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
