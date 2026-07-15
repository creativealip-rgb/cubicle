import { redirect } from "next/navigation";
import {
  createPersonalNote,
  listPersonalNotes,
  updatePersonalNoteStatus,
} from "@/lib/actions/personal-notes";
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
function parseJournalBody(body: string): { tags: string[]; mood: string; content: string } {
  const metaMatch = body.match(/^---tags:\s*(.*?)\nmood:\s*(.*?)---\n([\s\S]*)$/);
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

export default async function JournalPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  // Only non-archived journal entries (system prefix + includeSystem)
  const rawNotes = await listPersonalNotes(undefined, {
    includeSystem: true,
    titlePrefix: "[journal]",
    status: "active", // open + done, exclude archived
  });

  const entries = rawNotes
    .filter((n) => n.title.startsWith("[journal]"))
    .map((note) => {
      const parsed = parseJournalBody(note.body || "");
      return {
        id: note.id,
        title: note.title.replace(/^\[journal\]\s*/, ""),
        body: note.body || "",
        tags: parsed.tags,
        mood: parsed.mood,
        content: parsed.content,
        createdAt: String(note.createdAt),
      };
    });

  async function createEntry(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || new Date().toLocaleDateString("id-ID"));
    const content = String(formData.get("body") || "");
    const tags = String(formData.get("tags") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(", ");
    const mood = String(formData.get("mood") || "");
    const body = `---tags: ${tags}\nmood: ${mood}---\n${content}`;
    await createPersonalNote({
      title: `[journal] ${title}`,
      body,
      pinned: false,
      recurrenceRule: "none",
      notify7d: false,
      notify3d: false,
      notify1d: false,
    });
    redirect("/app/journal");
  }

  async function archiveEntry(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(String(formData.get("noteId")), "archived");
    redirect("/app/journal");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Jurnal", "Journal")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Catatan harian — insight, blockers, keputusan, refleksi.",
            "Daily notes — insights, blockers, decisions, reflections.",
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Entri jurnal baru", "New journal entry")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEntry} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("Judul", "Title")}</label>
                <Input name="title" placeholder={t("Judul hari ini", "Today's title")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("Tag (pisahkan koma)", "Tags (comma separated)")}
                </label>
                <Input name="tags" placeholder="work, meeting, blocker" />
              </div>
            </div>
            <MoodPicker name="mood" />
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Isi", "Content")}</label>
              <Textarea
                name="body"
                rows={8}
                placeholder={t(
                  "Tulis update, insight, blockers, keputusan...",
                  "Write updates, insights, blockers, decisions...",
                )}
                required
              />
            </div>
            <Button type="submit">{t("Simpan entri", "Save entry")}</Button>
          </form>
        </CardContent>
      </Card>

      <JournalList entries={entries} archiveAction={archiveEntry} lang={lang} />
    </div>
  );
}
