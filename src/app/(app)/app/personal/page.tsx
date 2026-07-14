import { redirect } from "next/navigation";
import {
  createPersonalNote,
  deletePersonalNote,
  listPersonalNotes,
  togglePersonalNotePinned,
  updatePersonalNote,
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

function formatDateTimeLocal(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const notes = await listPersonalNotes(query);

  async function createNote(formData: FormData) {
    "use server";
    await createPersonalNote({
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? "") || undefined,
      dueDate: String(formData.get("dueDate") ?? "") || undefined,
      recurrenceRule: String(formData.get("recurrenceRule") ?? "none") || "none",
      notify7d: formData.get("notify7d") === "on",
      notify3d: formData.get("notify3d") === "on",
      notify1d: formData.get("notify1d") === "on",
      pinned: formData.get("pinned") === "on",
    });
    redirect("/app/personal");
  }

  async function updateNote(formData: FormData) {
    "use server";
    await updatePersonalNote(String(formData.get("noteId") ?? ""), {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? "") || undefined,
      dueDate: String(formData.get("dueDate") ?? "") || undefined,
      recurrenceRule: String(formData.get("recurrenceRule") ?? "none") || "none",
      notify7d: formData.get("notify7d") === "on",
      notify3d: formData.get("notify3d") === "on",
      notify1d: formData.get("notify1d") === "on",
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
        <h1 className="text-2xl font-bold tracking-tight">Workspace Pribadi</h1>
        <p className="text-sm text-muted-foreground mt-1">Catatan pribadi user di workspace ini. Tidak tampil ke client.</p>
      </div>

      <form action="/app/personal" className="flex gap-2">
        <Input name="q" placeholder="Cari catatan..." defaultValue={query} />
        <Button type="submit" variant="outline">Cari</Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Catatan Baru</CardTitle></CardHeader>
          <CardContent>
            <form action={createNote} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">Judul</label>
                <Input id="title" name="title" placeholder="Follow up client..." required />
              </div>
              <div className="space-y-2">
                <label htmlFor="body" className="text-sm font-medium">Isi</label>
                <Textarea id="body" name="body" rows={7} placeholder="Catatan, ide, reminder personal..." />
              </div>
              <div className="space-y-2">
                <label htmlFor="dueDate" className="text-sm font-medium">Tenggat</label>
                <Input id="dueDate" name="dueDate" type="datetime-local" />
              </div>
              <div className="space-y-2">
                <label htmlFor="recurrenceRule" className="text-sm font-medium">Pengulangan</label>
                <Input id="recurrenceRule" name="recurrenceRule" defaultValue="none" placeholder="none, daily, weekly, monthly, yearly, custom rule" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" name="notify7d" /> 7d</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="notify3d" /> 3d</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="notify1d" /> 1d</label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pinned" /> Sematkan catatan
              </label>
              <Button type="submit" className="w-full">Buat Catatan</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Catatan</span>
              <span className="text-sm font-normal text-muted-foreground">{openNotes.length} aktif · {archivedCount} diarsipkan</span>
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
                      {note.pinned && <Badge variant="secondary">Disematkan</Badge>}
                      {note.status === "done" && <Badge>Selesai</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Diperbarui {formatDate(note.updatedAt)}</p>
                    {note.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Tenggat {formatDate(note.dueDate)} · Ulangi {note.recurrenceRule || "none"}
                      </p>
                    )}
                    {(note.notify7d || note.notify3d || note.notify1d) && (
                      <p className="text-xs text-muted-foreground">
                        Ingatkan {[note.notify7d && "7h", note.notify3d && "3h", note.notify1d && "1h"].filter(Boolean).join(" / ")} sebelumnya
                      </p>
                    )}
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
                      <Button type="submit" size="sm" variant="outline">Arsipkan</Button>
                    </form>
                    <form action={removeNote}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <Button type="submit" size="sm" variant="ghost" aria-label="Delete note"><Trash2 className="h-4 w-4" /></Button>
                    </form>
                  </div>
                </div>
                {note.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{note.body}</p>}
                <details className="rounded-md bg-muted/40 p-3">
                  <summary className="cursor-pointer text-sm font-medium">Ubah</summary>
                  <form action={updateNote} className="mt-3 space-y-3">
                    <input type="hidden" name="noteId" value={note.id} />
                    <Input name="title" defaultValue={note.title} required />
                    <Textarea name="body" defaultValue={note.body ?? ""} rows={4} />
                    <Input name="dueDate" type="datetime-local" defaultValue={formatDateTimeLocal(note.dueDate)} />
                    <Input name="recurrenceRule" defaultValue={note.recurrenceRule || "none"} placeholder="none, daily, weekly, monthly, yearly, custom rule" />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <label className="flex items-center gap-1"><input type="checkbox" name="notify7d" defaultChecked={note.notify7d} /> 7d</label>
                      <label className="flex items-center gap-1"><input type="checkbox" name="notify3d" defaultChecked={note.notify3d} /> 3d</label>
                      <label className="flex items-center gap-1"><input type="checkbox" name="notify1d" defaultChecked={note.notify1d} /> 1d</label>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="pinned" defaultChecked={note.pinned} /> Sematkan catatan
                    </label>
                    <Button type="submit" size="sm">Simpan Perubahan</Button>
                  </form>
                </details>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
