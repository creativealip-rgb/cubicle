import Link from "next/link";
import { db } from "@/db";
import { notifications, tasks, invoices } from "@/db/schema";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { eq, and, lte, inArray, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function NodesPage() {
  const workspaceId = await getWorkspaceForCurrentUser();
  const today = new Date().toISOString().slice(0, 10);

  const [dueTasks, openInvoices, recentNotifications] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, priority: tasks.priority, dueDate: tasks.dueDate })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), lte(tasks.dueDate, today), inArray(tasks.status, ["todo", "in_progress", "review"])))
      .orderBy(tasks.dueDate)
      .limit(20),
    db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status, dueDate: invoices.dueDate, total: invoices.total, currency: invoices.currency })
      .from(invoices)
      .where(and(eq(invoices.workspaceId, workspaceId), inArray(invoices.status, ["sent", "viewed", "overdue"])))
      .orderBy(invoices.dueDate)
      .limit(20),
    db.select().from(notifications).where(eq(notifications.workspaceId, workspaceId)).orderBy(desc(notifications.createdAt)).limit(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nodes & Reminders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Satu pusat untuk hal yang perlu ditindak: tugas, invoice, dan notifikasi.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Tugas lewat/jatuh tempo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dueTasks.length === 0 ? <p className="text-sm text-muted-foreground">Aman. Tidak ada tugas due.</p> : dueTasks.map((task) => (
              <div key={task.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{task.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{task.dueDate}</span><Badge>{task.priority}</Badge></div>
              </div>
            ))}
            <Button asChild variant="outline" size="sm"><Link href="/app/tasks">Open tasks</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invoice reminder</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {openInvoices.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada invoice tertunda.</p> : openInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{invoice.invoiceNumber}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>Due {invoice.dueDate ?? "—"}</span><Badge>{invoice.status}</Badge></div>
              </div>
            ))}
            <Button asChild variant="outline" size="sm"><Link href="/app/invoices">Open invoices</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent notifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentNotifications.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p> : recentNotifications.map((n) => (
              <div key={n.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{n.title}</div>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
