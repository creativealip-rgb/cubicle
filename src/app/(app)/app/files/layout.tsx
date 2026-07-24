import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, projects, folders as foldersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { FolderTree } from "@/components/files/folder-tree";
import { FilesPageHeader } from "@/components/files/files-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout stays mounted when only clientId/projectId/folderId query changes.
 * Page slot (children) re-fetches file list — tree does not full-page flash.
 */
export default async function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

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

  return (
    <div className="space-y-6 min-w-0">
      <Suspense
        fallback={
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        }
      >
        <FilesPageHeader
          workspaceId={workspaceId}
          canWrite={canWrite}
          title={t("Berkas", "Files")}
          subtitle={t("Kelola file workspace-mu", "Manage your workspace files")}
        />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="lg:col-span-1 h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t("Jelajahi", "Browse")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              }
            >
              <FolderTree
                clients={clientList}
                projects={projectList}
                folders={folderList}
                canWrite={canWrite}
              />
            </Suspense>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4 min-w-0">{children}</div>
      </div>
    </div>
  );
}
