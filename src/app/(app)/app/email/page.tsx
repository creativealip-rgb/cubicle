import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { createEmailDraft, listEmailMessages, sendEmailMessage, deleteEmailMessage } from "@/lib/actions/email-suite";
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
  const [messages, clientList, projectList] = await Promise.all([
    listEmailMessages(),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Suite</h1>
        <p className="text-sm text-muted-foreground mt-1">Tulis, simpan draft, dan kirim email client dari workspace.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Compose</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="toEmail" className="text-sm font-medium">To</label>
                <Input id="toEmail" name="toEmail" type="email" placeholder="client@example.com" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                <Input id="subject" name="subject" placeholder="Update project..." required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="clientId" className="text-sm font-medium">Client optional</label>
                <select id="clientId" name="clientId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No client</option>
                  {clientList.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}{client.email ? ` — ${client.email}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="projectId" className="text-sm font-medium">Project optional</label>
                <select id="projectId" name="projectId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No project</option>
                  {projectList.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="body" className="text-sm font-medium">Body</label>
              <Textarea id="body" name="body" rows={8} placeholder="Tulis email..." required />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button formAction={saveDraft} variant="outline" className="gap-2"><Save className="h-4 w-4" /> Save draft</Button>
              <Button formAction={sendNow} className="gap-2"><Send className="h-4 w-4" /> Send now</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent emails</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada email.</p>
          ) : messages.map((message) => (
            <div key={message.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{message.subject}</div>
                  <div className="text-sm text-muted-foreground">To: {message.toEmail}</div>
                  <div className="text-xs text-muted-foreground">{message.clientName || "No client"}{message.projectName ? ` · ${message.projectName}` : ""} · {formatDate(message.sentAt || message.createdAt)}</div>
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
