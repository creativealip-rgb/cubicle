import { redirect } from "next/navigation";
import { createPersonalNote, listPersonalNotes, updatePersonalNoteStatus } from "@/lib/actions/personal-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { JournalList, MoodPicker } from "@/components/journal/journal-list";

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
  // Legacy format — no metadata
  return { tags: [], mood: "", content: body };
}

export default async function JournalPage() {
  const rawNotes = (await listPersonalNotes("[journal]")).filter((n) => n.title.startsWith("[journal]"));

  const entries = rawNotes.map((note) => {
    const parsed = parseJournalBody(note.body || "");
    return {
      id: note.id,
      title: note.title.replace("[journal] ", ""),
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

    // Build body with metadata
    const body = `---tags: ${tags}\nmood: ${mood}---\n${content}`;

    await createPersonalNote({ title: `[journal] ${title}`, body, pinned: false });
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
        <h1 className="text-2xl font-bold tracking-tight">Jurnal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Catatan harian — insight, blockers, keputusan, refleksi.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New journal entry</CardTitle></CardHeader>
        <CardContent>
          <form action={createEntry} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Judul</label>
                <Input name="title" placeholder="Judul hari ini" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags (comma separated)</label>
                <Input name="tags" placeholder="work, meeting, blocker" />
              </div>
            </div>
            <MoodPicker name="mood" />
            <div className="space-y-2">
              <label className="text-sm font-medium">Isi</label>
              <Textarea name="body" rows={8} placeholder="Tulis update, insight, blockers, keputusan..." required />
            </div>
            <Button type="submit">Save entry</Button>
          </form>
        </CardContent>
      </Card>

      <JournalList entries={entries} />
    </div>
  );
}
