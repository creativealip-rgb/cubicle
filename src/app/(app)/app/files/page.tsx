import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { files as filesTable, clients, projects, folders as foldersTable } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { FileList } from "@/components/files/file-list";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { UploadButton } from "@/components/files/upload-button";
import { NewFolderButton } from "@/components/files/folder-actions";
import { FolderTree } from "@/components/files/folder-tree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ChevronRight } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string; folderId?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
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
  // Scope files to the active folder: inside a folder show its files,
  // otherwise show only root-level files (not nested in any folder).
  if (folderId) conditions.push(eq(filesTable.folderId, folderId));
  else conditions.push(isNull(filesTable.folderId));

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

  // Fetch clients, projects, and folders for folder tree
  const clientList = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(clients.name);

  const projectList = await db
    .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(projects.name);

  const folderList = await db
    .select({
      id: foldersTable.id,
      name: foldersTable.name,
      parentId: foldersTable.parentId,
      clientId: foldersTable.clientId,
      projectId: foldersTable.projectId,
    })
    .from(foldersTable)
    .where(eq(foldersTable.workspaceId, workspaceId))
    .orderBy(foldersTable.name);

  // Build breadcrumb path for the active scope
  const crumbs: { label: string; href: string }[] = [
    { label: t("Semua File", "All Files"), href: "/app/files" },
  ];
  const activeClient = clientId ? clientList.find((c) => c.id === clientId) : undefined;
  const activeProject = projectId ? projectList.find((p) => p.id === projectId) : undefined;
  if (activeClient) {
    crumbs.push({ label: activeClient.name, href: `/app/files?clientId=${activeClient.id}` });
  }
  if (activeProject) {
    crumbs.push({
      label: activeProject.name,
      href: `/app/files?clientId=${activeClient?.id ?? ""}&projectId=${activeProject.id}`,
    });
  }
  // Folder ancestry chain
  if (folderId) {
    const chain: { id: string; name: string }[] = [];
    let cursor = folderList.find((f) => f.id === folderId);
    let guard = 0;
    while (cursor && guard < 20) {
      chain.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parentId ? folderList.find((f) => f.id === cursor!.parentId) : undefined;
      guard++;
    }
    const base = new URLSearchParams();
    if (clientId) base.set("clientId", clientId);
    if (projectId) base.set("projectId", projectId);
    for (const node of chain) {
      const qs = new URLSearchParams(base);
      qs.set("folderId", node.id);
      crumbs.push({ label: node.name, href: `/app/files?${qs.toString()}` });
    }
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Berkas", "Files")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Kelola file workspace-mu", "Manage your workspace files")}</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <NewFolderButton
              workspaceId={workspaceId}
              clientId={clientId}
              projectId={projectId}
              parentId={folderId}
            />
            <UploadButton
              workspaceId={workspaceId}
              clientId={clientId}
              projectId={projectId}
              folderId={folderId}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t("Jelajahi", "Browse")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FolderTree
              currentClientId={clientId}
              currentProjectId={projectId}
              currentFolderId={folderId}
              clients={clientList}
              projects={projectList}
              folders={folderList}
              canWrite={canWrite}
            />
          </CardContent>
        </Card>

        {/* File list */}
        <div className="lg:col-span-3 space-y-4 min-w-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
            {crumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
                {i === crumbs.length - 1 ? (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <a href={crumb.href} className="hover:text-foreground hover:underline">
                    {crumb.label}
                  </a>
                )}
              </span>
            ))}
          </nav>

          <FileDropZone
            scope={{ workspaceId, clientId, projectId, folderId }}
            canWrite={canWrite}
          >
            <FileList files={finalFiles} workspaceId={workspaceId} />
          </FileDropZone>
        </div>
      </div>
    </div>
  );
}
