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
import { requireWorkspaceOwnerOrRedirect } from "@/lib/require-workspace-owner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentLang, createT } from "@/lib/i18n";
import {
  NotesListClient,
  type NoteItem,
} from "@/components/notes/notes-list-client";
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog";
import { NotesSummaryStrip } from "@/components/notes/notes-summary-strip";
import { calculateNotesSummary } from "@/lib/personal-notes-dashboard";
import { Search } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catatan",
  description: "Catatan pribadi workspace Cubiqlo.",
};

type Tab = "open" | "done" | "archived" | "all";

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
  await requireWorkspaceOwnerOrRedirect();
  const lang = await getCurrentLang();
  const t = createT(lang);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const tab = (
    ["open", "done", "archived", "all"].includes(params.tab ?? "")
      ? params.tab
      : "open"
  ) as Tab;
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
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.status, "active"),
        ),
      )
      .orderBy(projects.name)
      .limit(100),
  ]);

  const summary = calculateNotesSummary(
    notes.map((n) => ({
      id: n.id,
      dueDate: n.dueDate,
      status: n.status,
      pinned: n.pinned,
    })),
    counts
  );

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
    const urlParams = new URLSearchParams({ tab: back });
    if (q) urlParams.set("q", q);
    redirect(`/app/personal?${urlParams.toString()}`);
  }

  async function setStatus(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(
      String(formData.get("noteId") ?? ""),
      String(formData.get("status") ?? "open") as PersonalNoteStatus,
    );
    const back = String(formData.get("tab") ?? "open");
    const q = String(formData.get("q") ?? "");
    const urlParams = new URLSearchParams({ tab: back });
    if (q) urlParams.set("q", q);
    redirect(`/app/personal?${urlParams.toString()}`);
  }

  async function togglePinned(formData: FormData) {
    "use server";
    await togglePersonalNotePinned(
      String(formData.get("noteId") ?? ""),
      String(formData.get("pinned") ?? "false") === "true",
    );
    const back = String(formData.get("tab") ?? "open");
    const q = String(formData.get("q") ?? "");
    const urlParams = new URLSearchParams({ tab: back });
    if (q) urlParams.set("q", q);
    redirect(`/app/personal?${urlParams.toString()}`);
  }

  async function removeNote(formData: FormData) {
    "use server";
    await deletePersonalNote(String(formData.get("noteId") ?? ""));
    const back = String(formData.get("tab") ?? "open");
    const q = String(formData.get("q") ?? "");
    const urlParams = new URLSearchParams({ tab: back });
    if (q) urlParams.set("q", q);
    redirect(`/app/personal?${urlParams.toString()}`);
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
    <div className="space-y-6" data-ui="notes-action-dashboard">
      {/* Header with Title & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("Catatan Pribadi", "Personal Notes")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Catatan cepat, to-do pribadi, dan pengingat internal workspace.",
              "Private notes, quick to-dos, and reminders in this workspace.",
            )}
          </p>
        </div>

        <NoteEditorDialog lang={lang} createAction={createNote} />
      </div>

      {/* Modern Status Tabs Track (Matching Productivity style) */}
      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl bg-muted/60 p-1"
        aria-label={t("Navigasi status catatan", "Notes status navigation")}
      >
        {tabs.map((tabItem) => (
          <Button
            key={tabItem.id}
            size="sm"
            variant="ghost"
            className={`shrink-0 rounded-xl px-4 ${
              tab === tabItem.id
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground"
            }`}
            asChild
          >
            <Link
              href={`/app/personal?tab=${tabItem.id}${
                query ? `&q=${encodeURIComponent(query)}` : ""
              }`}
            >
              <span>{tabItem.label}</span>
              <span className="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {tabItem.count}
              </span>
            </Link>
          </Button>
        ))}
      </nav>

      {/* Summary KPI Strip */}
      <NotesSummaryStrip
        open={summary.open}
        dueSoon={summary.dueSoon}
        pinned={summary.pinned}
        done={summary.done}
        t={t}
      />

      {/* Main Content: Notes List Workspace */}
      <Card className="rounded-3xl border bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Internal Search Bar */}
          <form
            method="get"
            action="/app/personal"
            className="flex items-center gap-2"
          >
            <input type="hidden" name="tab" value={tab} />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={query}
                placeholder={t(
                  "Cari catatan berdasarkan judul atau isi…",
                  "Search notes by title or content…",
                )}
                className="rounded-2xl pl-9"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="rounded-2xl"
            >
              {t("Cari", "Search")}
            </Button>
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-2xl"
                asChild
              >
                <Link href={`/app/personal?tab=${tab}`}>
                  {t("Reset", "Reset")}
                </Link>
              </Button>
            )}
          </form>

          {/* List Client Component */}
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
  );
}
