import Link from "next/link";
import { redirect } from "next/navigation";
import {
  countPersonalNotes,
  createPersonalNote,
  deletePersonalNote,
  listPersonalNotes,
  updatePersonalNote,
  updatePersonalNoteStatus,
} from "@/lib/actions/personal-notes";
import { requireWorkspaceOwnerOrRedirect } from "@/lib/require-workspace-owner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JournalList } from "@/components/journal/journal-list";
import { JournalComposerDialog } from "@/components/journal/journal-composer-dialog";
import { JournalSummaryStrip } from "@/components/journal/journal-summary-strip";
import { calculateJournalSummary } from "@/lib/journal-dashboard";
import { getCurrentLang, createT } from "@/lib/i18n";
import {
  buildJournalBody,
  parseJournalBody,
  stripJournalPrefix,
} from "@/lib/journal-format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jurnal",
  description: "Catatan harian, refleksi, dan insight workspace Cubiqlo.",
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  await requireWorkspaceOwnerOrRedirect();
  const lang = await getCurrentLang();
  const t = createT(lang);
  const params = await searchParams;
  const tab = params.tab === "archived" ? "archived" : "active";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 10;

  const queryOpts = {
    includeSystem: true,
    titlePrefix: "[journal]",
    status: (tab === "archived" ? "archived" : "active") as
      "archived" | "active",
  };
  const [totalEntries, rawNotes] = await Promise.all([
    countPersonalNotes(undefined, queryOpts),
    listPersonalNotes(undefined, {
      ...queryOpts,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  const entries = rawNotes
    .filter((n) => n.title.toLowerCase().startsWith("[journal]"))
    .map((note) => {
      const parsed = parseJournalBody(note.body || "");
      return {
        id: note.id,
        title: stripJournalPrefix(note.title) || t("Tanpa judul", "Untitled"),
        body: note.body || "",
        tags: parsed.tags,
        mood: parsed.mood,
        content: parsed.content,
        status: note.status,
        createdAt: String(note.createdAt),
        updatedAt: String(note.updatedAt),
      };
    });

  const summary = calculateJournalSummary(entries, totalEntries);

  async function createEntry(formData: FormData) {
    "use server";
    const langNow = await getCurrentLang();
    const defaultTitle = new Date().toLocaleDateString(
      langNow === "en" ? "en-US" : "id-ID",
      { dateStyle: "medium" },
    );
    const title = String(formData.get("title") || "").trim() || defaultTitle;
    const content = String(formData.get("body") || "").trim();
    if (!content) throw new Error("Journal content required");
    const body = buildJournalBody(
      String(formData.get("tags") || ""),
      String(formData.get("mood") || ""),
      content,
    );
    await createPersonalNote({
      title: `[journal] ${title}`,
      body,
      pinned: false,
      recurrenceRule: "none",
      notify7d: false,
      notify3d: false,
      notify1d: false,
    });
    redirect("/app/journal?tab=active");
  }

  async function archiveEntry(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(
      String(formData.get("noteId") || ""),
      "archived",
    );
    redirect("/app/journal?tab=active");
  }

  async function restoreEntry(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(
      String(formData.get("noteId") || ""),
      "open",
    );
    redirect("/app/journal?tab=archived");
  }

  async function updateEntry(formData: FormData) {
    "use server";
    const noteId = String(formData.get("noteId") || "");
    const titleRaw = String(formData.get("title") || "").trim();
    const content = String(formData.get("body") || "").trim();
    if (!content) throw new Error("Journal content required");
    const body = buildJournalBody(
      String(formData.get("tags") || ""),
      String(formData.get("mood") || ""),
      content,
    );
    await updatePersonalNote(noteId, {
      title: `[journal] ${titleRaw || "Untitled"}`,
      body,
      pinned: false,
      recurrenceRule: "none",
      notify7d: false,
      notify3d: false,
      notify1d: false,
    });
    const back = String(formData.get("tab") || "active");
    redirect(`/app/journal?tab=${back === "archived" ? "archived" : "active"}`);
  }

  async function removeEntry(formData: FormData) {
    "use server";
    await deletePersonalNote(String(formData.get("noteId") || ""));
    const back = String(formData.get("tab") || "active");
    redirect(`/app/journal?tab=${back === "archived" ? "archived" : "active"}`);
  }

  return (
    <div className="space-y-6" data-ui="journal-timeline-dashboard">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("Jurnal Pribadi", "Personal Journal")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Catatan harian — insight, blockers, keputusan, dan refleksi berkala.",
              "Daily notes — insights, blockers, decisions, and periodic reflections.",
            )}
          </p>
        </div>

        <JournalComposerDialog lang={lang} createAction={createEntry} />
      </div>

      {/* Modern Status Tabs Track (Matching Productivity / Notes style) */}
      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl bg-muted/60 p-1"
        aria-label={t("Navigasi status jurnal", "Journal status navigation")}
      >
        {[
          { id: "active", label: t("Entri Aktif", "Active Entries") },
          { id: "archived", label: t("Arsip", "Archived") },
        ].map((tabItem) => (
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
            <Link href={`/app/journal?tab=${tabItem.id}`}>
              <span>{tabItem.label}</span>
            </Link>
          </Button>
        ))}
      </nav>

      {/* Summary KPI Strip */}
      <JournalSummaryStrip
        thisWeek={summary.thisWeek}
        currentStreak={summary.currentStreak}
        topMood={summary.topMood}
        totalEntries={summary.totalEntries}
        moodCounts={summary.moodCounts}
        t={t}
      />

      {/* Main Content: Chronological Timeline Area */}
      <Card className="rounded-3xl border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <JournalList
            entries={entries}
            tab={tab}
            lang={lang}
            actions={{
              archive: archiveEntry,
              restore: restoreEntry,
              update: updateEntry,
              remove: removeEntry,
            }}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                {t(
                  `Halaman ${page} dari ${totalPages}`,
                  `Page ${page} of ${totalPages}`,
                )}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link href={`/app/journal?tab=${tab}&page=${page - 1}`}>
                      {t("Sebelumnya", "Previous")}
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link href={`/app/journal?tab=${tab}&page=${page + 1}`}>
                      {t("Berikutnya", "Next")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
