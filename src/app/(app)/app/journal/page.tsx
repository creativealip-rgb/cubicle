import Link from "next/link";
import { redirect } from "next/navigation";
import {
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
import { getCurrentLang, createT } from "@/lib/i18n";

/**
 * Body format (v2):
 *   ---tags: work, meeting\nmood: 😊---\nActual content here
 *
 * Legacy (v1): plain text body (no tags/mood)
 */
function parseJournalBody(body: string): {
  tags: string[];
  mood: string;
  content: string;
} {
  const metaMatch = body.match(
    /^---tags:\s*(.*?)\nmood:\s*(.*?)---\n([\s\S]*)$/,
  );
  if (metaMatch) {
    const tags = metaMatch[1]
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const mood = metaMatch[2].trim();
    const content = metaMatch[3];
    return { tags, mood, content };
  }
  return { tags: [], mood: "", content: body };
}

function buildJournalBody(tagsRaw: string, mood: string, content: string) {
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .join(", ");
  return `---tags: ${tags}\nmood: ${mood}---\n${content}`;
}

function stripJournalPrefix(title: string) {
  return title.replace(/^\[journal\]\s*/i, "");
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireWorkspaceOwnerOrRedirect();
  const lang = await getCurrentLang();
  const t = createT(lang);
  const params = await searchParams;
  const tab = params.tab === "archived" ? "archived" : "active";

  const rawNotes = await listPersonalNotes(undefined, {
    includeSystem: true,
    titlePrefix: "[journal]",
    status: tab === "archived" ? "archived" : "active",
    limit: 200,
  });

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
    await updatePersonalNoteStatus(String(formData.get("noteId") || ""), "archived");
    redirect("/app/journal?tab=active");
  }

  async function restoreEntry(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(String(formData.get("noteId") || ""), "open");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("Jurnal", "Journal")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Catatan harian — insight, blockers, keputusan, refleksi.",
            "Daily notes — insights, blockers, decisions, reflections.",
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={tab === "active" ? "default" : "outline"}>
          <Link href="/app/journal?tab=active">{t("Aktif", "Active")}</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={tab === "archived" ? "default" : "outline"}
        >
          <Link href="/app/journal?tab=archived">{t("Arsip", "Archived")}</Link>
        </Button>
      </div>

      {tab === "active" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Entri jurnal baru", "New journal entry")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createEntry} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("Judul", "Title")}
                  </label>
                  <Input
                    name="title"
                    placeholder={t("Judul hari ini", "Today's title")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("Tag (pisahkan koma)", "Tags (comma separated)")}
                  </label>
                  <Input
                    name="tags"
                    placeholder={t(
                      "kerja, rapat, blocker",
                      "work, meeting, blocker",
                    )}
                  />
                </div>
              </div>
              <MoodPicker name="mood" lang={lang} />
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("Isi", "Content")}</label>
                <Textarea
                  name="body"
                  rows={8}
                  placeholder={t(
                    "Tulis update, insight, blocker, keputusan…",
                    "Write updates, insights, blockers, decisions…",
                  )}
                  required
                />
              </div>
              <Button type="submit">{t("Simpan entri", "Save entry")}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {tab === "archived"
              ? t("Arsip jurnal", "Archived journal")
              : t("Entri jurnal", "Journal entries")}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
