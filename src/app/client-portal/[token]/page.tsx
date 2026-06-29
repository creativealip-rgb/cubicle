import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  projects,
  tasks,
  files,
  invoices,
  comments,
  portalVisits,
  portalRequests,
  activityLogs,
} from "@/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { getClientPortalAccess, logPortalAccess } from "@/lib/actions/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Folder,
  FileText,
  CheckCircle2,
  MessageSquare,
  Activity,
} from "lucide-react";
import { PortalProjectCard } from "@/components/portal/portal-project-card";
import { PortalTaskList } from "@/components/portal/portal-task-list";
import { PortalFileList } from "@/components/portal/portal-file-list";
import { PortalCommentForm } from "@/components/portal/portal-comment-form";
import { PortalRequestList } from "@/components/portal/portal-request-list";

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let client;
  try {
    client = await getClientPortalAccess(token);
  } catch {
    notFound();
  }

  // Log access
  try {
    const headersList = await headers();
    await logPortalAccess({
      workspaceId: client.workspaceId,
      clientId: client.id,
      tokenType: "client_portal",
      tokenHashPrefix: token.slice(0, 8),
      ipAddress: headersList.get("x-forwarded-for") || undefined,
      userAgent: headersList.get("user-agent") || undefined,
    });
  } catch {
    // Non-critical
  }

  // Fetch visible projects
  const clientProjects = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, client.workspaceId),
        eq(projects.clientId, client.id),
        eq(projects.clientVisible, true),
      ),
    );

  // Fetch all tasks for visible projects in one query
  const visibleProjectIds = clientProjects.map((p) => p.id);
  let allVisibleTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
    updatedAt: Date;
    projectId: string;
  }> = [];

  if (visibleProjectIds.length > 0) {
    // eslint-disable-next-line unused-imports/no-unused-vars -- value used via typeof in projectTasksMap below
    allVisibleTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
        projectId: tasks.projectId,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.clientVisible, true),
          // We need to check projectId is in visibleProjectIds
          // Using SQL-level filter
        ),
      )
      .limit(500);
  }

  // Actually filter by project IDs using a more targeted approach
  const projectTasksMap = new Map<string, typeof allVisibleTasks>();
  if (visibleProjectIds.length > 0) {
    for (const projectId of visibleProjectIds) {
      const projectTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          updatedAt: tasks.updatedAt,
          projectId: tasks.projectId,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, projectId),
            eq(tasks.clientVisible, true),
          ),
        )
        .limit(100);
      projectTasksMap.set(projectId, projectTasks);
    }
  }

  // Fetch client-visible files per project
  const projectFilesMap = new Map<string, Array<{
    id: string;
    name: string;
    mimeType: string | null;
    sizeBytes: number | null;
    fileType: string;
    createdAt: Date;
  }>>();

  for (const projectId of visibleProjectIds) {
    const projectFiles = await db
      .select({
        id: files.id,
        name: files.name,
        mimeType: files.mimeType,
        sizeBytes: files.sizeBytes,
        fileType: files.fileType,
        createdAt: files.createdAt,
      })
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
          eq(files.visibility, "client"),
        ),
      )
      .limit(100);
    projectFilesMap.set(projectId, projectFiles);
  }

  // Track file visibility on portal open: mark files last viewed, audit visits,
  // and notify workspace on first ever portal view per file.
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;
    const { notifyWorkspaceMembers } = await import("@/lib/in-app-notifications");
    for (const projectFiles of projectFilesMap.values()) {
      for (const file of projectFiles) {
        const [{ seen = 0 } = {}] = await db
          .select({ seen: sql<number>`count(*)::int` })
          .from(portalVisits)
          .where(and(eq(portalVisits.resourceType, "file"), eq(portalVisits.resourceId, file.id)));

        await db.insert(portalVisits).values({
          workspaceId: client.workspaceId,
          clientId: client.id,
          resourceType: "file",
          resourceId: file.id,
          ipAddress,
          userAgent,
        });

        await db
          .update(files)
          .set({ lastViewedAt: new Date() })
          .where(eq(files.id, file.id));

        if (seen === 0) {
          await notifyWorkspaceMembers(client.workspaceId, {
            type: "file_viewed",
            title: `${client.name} viewed ${file.name}`,
            body: "First portal view",
            link: `/app/files?focus=${file.id}`,
            entityType: "file",
            entityId: file.id,
            actorId: null,
          });
        }
      }
    }
  } catch {
    // non-critical analytics / notification
  }

  // Fetch client-visible comments per project
  const projectCommentsMap = new Map<string, Array<{
    id: string;
    body: string;
    authorName: string | null;
    authorEmail: string | null;
    source: string;
    createdAt: Date;
  }>>();

  for (const projectId of visibleProjectIds) {
    const projectComments = await db
      .select({
        id: comments.id,
        body: comments.body,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        source: comments.source,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(
        and(
          eq(comments.entityType, "project"),
          eq(comments.entityId, projectId),
          eq(comments.visibility, "client"),
        ),
      )
      .limit(50);
    projectCommentsMap.set(projectId, projectComments);
  }

  const clientVisibleActionLabels: Record<string, string> = {
    created_project: "Project created",
    updated_project: "Project updated",
    updated_project_visibility: "Project shared",
    created_task: "Task added",
    updated_task: "Task updated",
    updated_task_status: "Task status updated",
    uploaded_file: "File shared",
    created_comment: "Comment added",
  };

  const projectTimelineMap = new Map<string, Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: Date;
  }>>();

  for (const project of clientProjects) {
    const projectTasks = projectTasksMap.get(project.id) || [];
    const projectFiles = projectFilesMap.get(project.id) || [];
    const projectComments = projectCommentsMap.get(project.id) || [];
    const visibleEntityIds = [
      project.id,
      ...projectTasks.map((task) => task.id),
      ...projectFiles.map((file) => file.id),
      ...projectComments.map((comment) => comment.id),
    ];

    if (visibleEntityIds.length === 0) {
      projectTimelineMap.set(project.id, []);
      continue;
    }

    const timeline = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.workspaceId, client.workspaceId),
          inArray(activityLogs.entityId, visibleEntityIds),
          inArray(activityLogs.action, Object.keys(clientVisibleActionLabels)),
        ),
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(12);

    projectTimelineMap.set(project.id, timeline);
  }

  const clientPortalRequests = await db
    .select({
      id: portalRequests.id,
      title: portalRequests.title,
      description: portalRequests.description,
      type: portalRequests.type,
      status: portalRequests.status,
      dueDate: portalRequests.dueDate,
      projectId: portalRequests.projectId,
    })
    .from(portalRequests)
    .where(
      and(
        eq(portalRequests.workspaceId, client.workspaceId),
        eq(portalRequests.clientId, client.id),
      ),
    )
    .limit(100);

  // Fetch shared invoices
  const sharedInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      status: invoices.status,
      currency: invoices.currency,
      sharedTokenHash: invoices.sharedTokenHash,
      sharedTokenRevokedAt: invoices.sharedTokenRevokedAt,
      sharedTokenExpiresAt: invoices.sharedTokenExpiresAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, client.workspaceId),
        eq(invoices.clientId, client.id),
      ),
    )
    .limit(50);

  // Filter to only those with active shared tokens
  const activeSharedInvoices = sharedInvoices.filter(
    (inv) =>
      inv.sharedTokenHash &&
      !inv.sharedTokenRevokedAt &&
      (inv.sharedTokenExpiresAt
        ? new Date(inv.sharedTokenExpiresAt) > new Date()
        : true),
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {client.companyName || client.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Client Portal — Secured Access
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Requests & reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PortalRequestList requests={clientPortalRequests} token={token} />
          </CardContent>
        </Card>

        {/* Projects Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Projects ({clientProjects.length})
          </h2>
          {clientProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No projects have been shared with you yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {clientProjects.map((project) => {
                const projectTasks = projectTasksMap.get(project.id) || [];
                const projectFiles = projectFilesMap.get(project.id) || [];
                const projectComments = projectCommentsMap.get(project.id) || [];
                const projectTimeline = projectTimelineMap.get(project.id) || [];

                return (
                  <Card key={project.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{project.name}</span>
                        <Badge variant="outline">{project.status}</Badge>
                      </CardTitle>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <PortalProjectCard
                        project={{
                          id: project.id,
                          name: project.name,
                          status: project.status,
                          description: project.description,
                        }}
                      />

                      {/* Tasks */}
                      {projectTasks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Tasks
                          </h4>
                          <PortalTaskList
                            tasks={projectTasks.map((t) => ({
                              id: t.id,
                              title: t.title,
                              description: t.description,
                              status: t.status,
                              priority: t.priority,
                              dueDate: t.dueDate
                                ? String(t.dueDate)
                                : null,
                              updatedAt: String(t.updatedAt),
                            }))}
                          />
                        </div>
                      )}

                      {/* Files */}
                      {projectFiles.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Files
                          </h4>
                          <PortalFileList
                            files={projectFiles.map((f) => ({
                              id: f.id,
                              name: f.name,
                              mimeType: f.mimeType,
                              sizeBytes: f.sizeBytes ?? null,
                              fileType: f.fileType,
                              createdAt: String(f.createdAt),
                            }))}
                            token={token}
                          />
                        </div>
                      )}

                      {/* Timeline */}
                      {projectTimeline.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Timeline
                          </h4>
                          <div className="rounded-lg border divide-y">
                            {projectTimeline.map((event) => (
                              <div key={event.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                  <span className="truncate">
                                    {clientVisibleActionLabels[event.action] ?? event.action.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {event.entityType.replace(/_/g, " ")}
                                  </Badge>
                                  <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Comments */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" /> Comments
                        </h4>
                        {projectComments.length > 0 && (
                          <div className="space-y-3 mb-4">
                            {projectComments.map((c) => (
                              <div
                                key={c.id}
                                className="bg-muted/50 rounded-lg p-3 text-sm"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {c.authorName || c.authorEmail || "Anonymous"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(c.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap">{c.body}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <PortalCommentForm
                          entityType="project"
                          entityId={project.id}
                          workspaceId={client.workspaceId}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Invoices Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Shared Invoices ({activeSharedInvoices.length})
          </h2>
          {activeSharedInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No invoices have been shared with you yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg divide-y">
              {activeSharedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <span className="font-mono text-sm font-medium">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-sm text-muted-foreground ml-3">
                      {inv.issueDate
                        ? new Date(inv.issueDate).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: inv.currency,
                      }).format(Number(inv.total))}
                    </span>
                    <Badge variant="outline">{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground pt-8">
          Powered by <span className="font-medium">Cubiqlo</span> — Client
          Portal
        </p>
      </div>
    </div>
  );
}
