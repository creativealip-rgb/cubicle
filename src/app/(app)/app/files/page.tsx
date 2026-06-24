import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { files as filesTable, workspaces, clients, projects } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { FileList } from "@/components/files/file-list";
import { UploadButton } from "@/components/files/upload-button";
import { FolderTree } from "@/components/files/folder-tree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

async function getWorkspaceId() {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string; folderId?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const sp = await searchParams;
  const clientId = sp.clientId;
  const projectId = sp.projectId;
  const folderId = sp.folderId;

  // Fetch files with filters
  const { users } = await import("@/db/schema");
  const conditions = [eq(filesTable.workspaceId, workspaceId)];
  if (clientId) conditions.push(eq(filesTable.clientId, clientId));
  if (projectId) conditions.push(eq(filesTable.projectId, projectId));

  const finalFiles = await db
    .select({
      id: filesTable.id,
      name: filesTable.name,
      mimeType: filesTable.mimeType,
      sizeBytes: filesTable.sizeBytes,
      visibility: filesTable.visibility,
      fileType: filesTable.fileType,
      uploadedBy: filesTable.uploadedBy,
      uploaderName: users.name,
      createdAt: filesTable.createdAt,
    })
    .from(filesTable)
    .leftJoin(users, eq(users.id, filesTable.uploadedBy))
    .where(and(...conditions))
    .orderBy(desc(filesTable.createdAt));

  // Fetch clients and projects for folder tree
  const clientList = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(clients.name);

  const projectList = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(projects.name);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">File</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola file workspace-mu</p>
        </div>
        {canWrite && (
          <UploadButton
            workspaceId={workspaceId}
            clientId={clientId}
            projectId={projectId}
            folderId={folderId}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Jelajahi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FolderTree
              currentClientId={clientId}
              currentProjectId={projectId}
              currentFolderId={folderId}
              clients={clientList}
              projects={projectList}
              folders={[]}
            />
          </CardContent>
        </Card>

        {/* File list */}
        <div className="lg:col-span-3">
          <FileList files={finalFiles} workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
}
