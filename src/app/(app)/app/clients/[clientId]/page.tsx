import { getWorkspaceForCurrentUser, getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, projects, tasks, workspaces, files, invoices, appointments } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireUser, assertClientInWorkspace } from "@/lib/access";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/client-form";
import Link from "next/link";
import {
  Globe,
  FileText,
  Calendar,
  MessageSquare,
  ArrowLeft,
  Pencil,
  Receipt,
  Users,
} from "lucide-react";
import { PortalTokenSection } from "./portal-section";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const { clientId } = await params;

  try {
    await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  } catch {
    notFound();
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) notFound();

  // Projects
  const clientProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      dueDate: projects.dueDate,
      clientVisible: projects.clientVisible,
      taskCount: sql<number>`count(${tasks.id})::int`,
      doneCount: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(eq(projects.clientId, clientId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  // Files
  const clientFiles = await db
    .select()
    .from(files)
    .where(eq(files.clientId, clientId))
    .orderBy(desc(files.createdAt))
    .limit(20);

  // Invoices
  const clientInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.createdAt));

  // Appointments
  const clientAppointments = await db
    .select()
    .from(appointments)
    .where(eq(appointments.clientId, clientId))
    .orderBy(desc(appointments.startTime));

  // Notes — use internal notes field + comments on visible projects
  // (no direct client comments in schema)

  // Active projects count
  const activeProjects = clientProjects.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/app/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to Clients
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <Badge variant={client.status === "active" ? "default" : "secondary"}>
              {client.status}
            </Badge>
          </div>
          {client.companyName && (
            <p className="text-sm text-muted-foreground">{client.companyName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Client</DialogTitle>
              </DialogHeader>
              <ClientForm
                mode="edit"
                defaultValues={{
                  id: client.id,
                  name: client.name,
                  companyName: client.companyName ?? "",
                  email: client.email ?? "",
                  phone: client.phone ?? "",
                  website: client.website ?? "",
                  address: client.address ?? "",
                  tags: client.tags ?? [],
                  internalNotes: client.internalNotes ?? "",
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Projects</p>
            <p className="text-2xl font-bold">{activeProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unpaid Invoices</p>
            <p className="text-2xl font-bold">
              {clientInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Files</p>
            <p className="text-2xl font-bold">{clientFiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Portal</p>
            <p className="text-2xl font-bold">
              {client.portalEnabled ? (
                <span className="flex items-center gap-1 text-green-600 text-base">
                  <Globe className="h-4 w-4" /> Active
                </span>
              ) : (
                <span className="text-muted-foreground text-base">Off</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info Row */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {client.email && (
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p>{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p>{client.phone}</p>
              </div>
            )}
            {client.website && (
              <div>
                <p className="text-xs text-muted-foreground">Website</p>
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {client.website}
                </a>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="truncate">{client.address}</p>
              </div>
            )}
          </div>
          {client.tags && client.tags.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {client.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {client.internalNotes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Internal Notes</p>
              <p className="text-sm mt-1">{client.internalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1">
            <Users className="h-3 w-3" /> Overview
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1">
            <FileText className="h-3 w-3" /> Projects ({clientProjects.length})
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1">
            <FileText className="h-3 w-3" /> Files ({clientFiles.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1">
            <Receipt className="h-3 w-3" /> Invoices ({clientInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-1">
            <Calendar className="h-3 w-3" /> Appointments
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1">
            <MessageSquare className="h-3 w-3" /> Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <PortalTokenSection client={client} />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4 pt-4">
          {clientProjects.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No projects yet</p>
          )}
          {clientProjects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{project.status}</Badge>
                    <span>{project.doneCount}/{project.taskCount} tasks done</span>
                    {project.dueDate && <span>Due: {project.dueDate}</span>}
                  </div>
                </div>
                {project.taskCount > 0 && (
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.round((project.doneCount / project.taskCount) * 100)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="files" className="space-y-4 pt-4">
          {clientFiles.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No files uploaded yet</p>
          )}
          {clientFiles.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.mimeType} · {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : "Unknown size"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{file.visibility}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 pt-4">
          {clientInvoices.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet</p>
          )}
          {clientInvoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.issueDate} · Due: {inv.dueDate ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={inv.status === "overdue" ? "destructive" : inv.status === "paid" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {inv.status}
                  </Badge>
                  <span className="text-sm font-semibold">{inv.currency} {inv.total}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4 pt-4">
          {clientAppointments.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No appointments</p>
          )}
          {clientAppointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt.attendeeName && `${apt.attendeeName} · `}
                      {new Date(apt.startTime).toLocaleDateString()}{" "}
                      {new Date(apt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{apt.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium">Internal Notes</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {client.internalNotes || "No internal notes."}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
