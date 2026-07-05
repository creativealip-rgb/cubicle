import { redirect } from "next/navigation";
import { createPersonalNote, listPersonalNotes, updatePersonalNoteStatus } from "@/lib/actions/personal-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

function stamp(value: Date | string) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function JournalPage() {
  const notes = (await listPersonalNotes("[journal]" )).filter((n) => n.title.startsWith("[journal]"));

  async function createEntry(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || new Date().toLocaleDateString("id-ID"));
    const body = String(formData.get("body") || "");
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
        <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Catatan harian dedicated, terpisah dari notes biasa.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>New journal entry</CardTitle></CardHeader>
        <CardContent>
          <form action={createEntry} className="space-y-3">
            <Input name="title" placeholder="Judul hari ini" />
            <Textarea name="body" rows={8} placeholder="Tulis update, insight, blockers, keputusan..." required />
            <Button type="submit">Save entry</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {notes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada journal.</p> : notes.map((note) => (
          <Card key={note.id}>
            <CardHeader><CardTitle className="text-base">{note.title.replace("[journal] ", "")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{note.body}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stamp(note.createdAt)}</span>
                <form action={archiveEntry}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <Button size="sm" variant="outline">Archive</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
