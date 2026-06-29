import { redirect } from "next/navigation";
import {
  createPersonalNote,
  deletePersonalNote,
  listPersonalNotes,
  togglePersonalNotePinned,
  updatePersonalNoteStatus,
} from "@/lib/actions/personal-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Pin, Trash2 } from "lucide-react";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function PersonalPage() {
  const notes = await listPersonalNotes();

  async function createNote(formData: FormData) {
    "use server";
    await createPersonalNote({
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? "") || undefined,
      pinned: formData.get("pinned") === "on",
    });
    redirect("/app/personal");
  }

  async function setStatus(formData: FormData) {
    "use server";
    await updatePersonalNoteStatus(
      String(formData.get("noteId") ?? ""),
      String(formData.get("status") ?? "open") as "open" | "done" | "archived",
    );
    redirect("/app/personal");
  }

  async function togglePinned(formData: FormData) {
    "use server";
    await togglePersonalNotePinned(
      String(formData.get("noteId") ?? ""),
      String(formData.get("pinned") ?? "false") === "true",
    );
    redirect("/app/personal");
  }

  async function removeNote(formData: FormData) {
    "use server";
    await deletePersonalNote(String(formData.get("noteId") ?? ""));
    redirect("/app/personal");
  }

  const openNotes = notes.filter((note) => note.status !== "archived");
  const archivedCount = notes.length - openNotes.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Personal Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">Catatan pribadi user di workspace ini. Tidak tampil ke client.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>New note</CardTitle></CardHeader>
          <CardContent>
            <form action={createNote} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">Title</label>
                <Input id="title" name="title" placeholder="Follow up client..." required />
              </div>
              <div className="space-y-2">
                <label htmlFor="body" className="text-sm font-medium">Body</label>
                <Textarea id="body" name="body" rows={7} placeholder="Catatan, ide, reminder personal..." />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pinned" /> Pin note
              </label>
              <Button type="submit" className="w-full">Create note</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Notes</span>
              <span className="text-sm font-normal text-muted-foreground">{openNotes.length} active · {archivedCount} archived</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada catatan aktif.</p>
            ) : openNotes.map((note) => (
              <div key={note.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{note.title}</h3>
                      {note.pinned && <Badge variant="secondary">Pinned</Badge>}
                      {note.status === "done" && <Badge>Done</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Updated {formatDate(note.updatedAt)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <form action={togglePinned}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="pinned" value={(!note.pinned).toString()} />
                      <Button type="submit" size="sm" variant="ghost" aria-label="Toggle pin"><Pin className="h-4 w-4" /></Button>
                    </form>
                    <form action={setStatus}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="status" value={note.status === "done" ? "open" : "done"} />
                      <Button type="submit" size="sm" variant="ghost" aria-label="Toggle done"><CheckCircle2 className="h-4 w-4" /></Button>
                    </form>
                    <form action={setStatus}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="status" value="archived" />
                      <Button type="submit" size="sm" variant="outline">Archive</Button>
                    </form>
                    <form action={removeNote}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <Button type="submit" size="sm" variant="ghost" aria-label="Delete note"><Trash2 className="h-4 w-4" /></Button>
                    </form>
                  </div>
                </div>
                {note.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{note.body}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
