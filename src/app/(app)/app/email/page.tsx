import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import {
  createEmailDraft,
  createEmailTemplate,
  deleteEmailMessage,
  deleteEmailTemplate,
  listEmailMessages,
  listEmailTemplates,
  sendEmailMessage,
} from "@/lib/actions/email-suite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Save, Trash2 } from "lucide-react";

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function EmailPage() {
  const workspaceId = await getWorkspaceForCurrentUser();
  const [messages, templates, clientList, projectList] = await Promise.all([
    listEmailMessages(),
    listEmailTemplates(),
    db.select({ id: clients.id, name: clients.name, email: clients.email }).from(clients).where(eq(clients.workspaceId, workspaceId)).orderBy(clients.name).limit(200),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(projects.name).limit(200),
  ]);

  async function saveDraft(formData: FormData) {
    "use server";
    await createEmailDraft({
      toEmail: String(formData.get("toEmail") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
      clientId: String(formData.get("clientId") ?? "") || undefined,
      projectId: String(formData.get("projectId") ?? "") || undefined,
    });
    redirect("/app/email");
  }

  async function sendNow(formData: FormData) {
    "use server";
    await sendEmailMessage({
      toEmail: String(formData.get("toEmail") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
      clientId: String(formData.get("clientId") ?? "") || undefined,
      projectId: String(formData.get("projectId") ?? "") || undefined,
    });
    redirect("/app/email");
  }

  async function removeMessage(formData: FormData) {
    "use server";
    await deleteEmailMessage(String(formData.get("messageId") ?? ""));
    redirect("/app/email");
  }

  async function saveTemplate(formData: FormData) {
    "use server";
    await createEmailTemplate({
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? "general") || "general",
      subject: String(formData.get("templateSubject") ?? ""),
      body: String(formData.get("templateBody") ?? ""),
    });
    redirect("/app/email");
  }

  async function removeTemplate(formData: FormData) {
    "use server";
    await deleteEmailTemplate(String(formData.get("templateId") ?? ""));
    redirect("/app/email");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email</h1>
        <p className="text-sm text-muted-foreground mt-1">Tulis, simpan draf, dan kirim email ke klien langsung dari workspace.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Tulis Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="toEmail" className="text-sm font-medium">Kepada</label>
                <Input id="toEmail" name="toEmail" type="email" placeholder="klien@contoh.com" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">Subjek</label>
                <Input id="subject" name="subject" placeholder="Update proyek..." required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="clientId" className="text-sm font-medium">Klien (opsional)</label>
                <select id="clientId" name="clientId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Tanpa klien</option>
                  {clientList.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}{client.email ? ` — ${client.email}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="projectId" className="text-sm font-medium">Proyek (opsional)</label>
                <select id="projectId" name="projectId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Tanpa proyek</option>
                  {projectList.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="body" className="text-sm font-medium">Isi</label>
              <Textarea id="body" name="body" rows={8} placeholder="Tulis email..." required />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button formAction={saveDraft} variant="outline" className="gap-2"><Save className="h-4 w-4" /> Simpan draf</Button>
              <Button formAction={sendNow} className="gap-2"><Send className="h-4 w-4" /> Kirim sekarang</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Template Email</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form action={saveTemplate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Nama template</label>
              <Input id="name" name="name" placeholder="Update proyek" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">Kategori</label>
              <Input id="category" name="category" placeholder="follow-up" defaultValue="general" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="templateSubject" className="text-sm font-medium">Subject</label>
              <Input id="templateSubject" name="templateSubject" placeholder="Update: {{project}}" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="templateBody" className="text-sm font-medium">Body</label>
              <Textarea id="templateBody" name="templateBody" rows={5} placeholder="Hi {{client}}, ..." required />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="outline" className="gap-2"><Save className="h-4 w-4" /> Simpan template</Button>
            </div>
          </form>

          <div className="grid gap-3 md:grid-cols-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada template.</p>
            ) : templates.map((template) => (
              <div key={template.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.category}</div>
                  </div>
                  <form action={removeTemplate}>
                    <input type="hidden" name="templateId" value={template.id} />
                    <Button type="submit" size="sm" variant="ghost" aria-label="Delete template"><Trash2 className="h-4 w-4" /></Button>
                  </form>
                </div>
                <div className="text-sm font-medium">{template.subject}</div>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{template.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Email Terkirim</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada email.</p>
          ) : messages.map((message) => (
            <div key={message.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{message.subject}</div>
                  <div className="text-sm text-muted-foreground">Kepada: {message.toEmail}</div>
                  <div className="text-xs text-muted-foreground">{message.clientName || "Tanpa klien"}{message.projectName ? ` · ${message.projectName}` : ""} · {formatDate(message.sentAt || message.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={message.status === "sent" ? "default" : message.status === "failed" ? "destructive" : "secondary"}>{message.status}</Badge>
                  <form action={removeMessage}>
                    <input type="hidden" name="messageId" value={message.id} />
                    <Button type="submit" size="sm" variant="ghost" aria-label="Delete email"><Trash2 className="h-4 w-4" /></Button>
                  </form>
                </div>
              </div>
              <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{message.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
