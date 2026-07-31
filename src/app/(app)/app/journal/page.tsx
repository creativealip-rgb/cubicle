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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { JournalList, MoodPicker } from "@/components/journal/journal-list";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { getCurrentLang, createT } from "@/lib/i18n";
import {
  buildJournalBody,
  parseJournalBody,
  stripJournalPrefix,
} from "@/lib/journal-format";

/**
 * Body format (v2):
 *   ---tags: work, meeting\nmood: 😊---\nActual content here
 *
 * Legacy (v1): plain text body (no tags/mood)
 */
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
    <div className="space-y-4" data-ui="journal-compact-timeline">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">{t("Jurnal", "Journal")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Catatan harian — insight, blockers, keputusan, refleksi.",
              "Daily notes — insights, blockers, decisions, reflections.",
            )}
          </p>
        </div>
      </div>

      <div
        className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]"
        data-ui="journal-split-view"
      >
        {tab === "active" ? (
          <Card id="new-journal" className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("Entri jurnal baru", "New journal entry")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createEntry} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="journal-title" className="text-sm font-medium">
                    {t("Judul", "Title")}
                  </label>
                  <Input
                    id="journal-title"
                    name="title"
                    placeholder={t("Judul hari ini", "Today's title")}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="journal-tags" className="text-sm font-medium">
                    {t("Tag", "Tags")}
                  </label>
                  <Input
                    id="journal-tags"
                    name="tags"
                    placeholder={t(
                      "kerja, rapat, blocker",
                      "work, meeting, blocker",
                    )}
                  />
                </div>
                <MoodPicker name="mood" lang={lang} />
                <div className="space-y-2">
                  <label htmlFor="journal-body" className="text-sm font-medium">
                    {t("Isi", "Content")}
                  </label>
                  <Textarea
                    id="journal-body"
                    name="body"
                    rows={10}
                    placeholder={t(
                      "Tulis update, insight, blocker, keputusan…",
                      "Write updates, insights, blockers, decisions…",
                    )}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {t("Simpan entri", "Save entry")}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="min-w-0 space-y-3">
          <StatusFilterTabs
            activeValue={tab}
            hideEmpty={false}
            tabs={[
              {
                value: "active",
                label: t("Aktif", "Active"),
                href: "/app/journal?tab=active",
                alwaysShow: true,
              },
              {
                value: "archived",
                label: t("Arsip", "Archived"),
                href: "/app/journal?tab=archived",
                alwaysShow: true,
              },
            ]}
          />

          <Card className="overflow-hidden">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base">
                {tab === "archived"
                  ? t("Arsip jurnal", "Archived journal")
                  : t("Entri jurnal", "Journal entries")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
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
              {totalEntries > pageSize ? (
                <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                  {page > 1 ? (
                    <Button variant="outline" asChild>
                      <Link href={`/app/journal?tab=${tab}&page=${page - 1}`}>
                        {t("Sebelumnya", "Previous")}
                      </Link>
                    </Button>
                  ) : (
                    <span />
                  )}
                  <span className="text-muted-foreground">
                    {t("Halaman", "Page")} {Math.min(page, totalPages)} /{" "}
                    {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Button variant="outline" asChild>
                      <Link href={`/app/journal?tab=${tab}&page=${page + 1}`}>
                        {t("Berikutnya", "Next")}
                      </Link>
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
