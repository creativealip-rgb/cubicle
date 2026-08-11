import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, projects, folders as foldersTable, files as filesTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { FolderTree } from "@/components/files/folder-tree";
import { FilesPageHeader } from "@/components/files/files-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceStorageQuota } from "@/lib/storage-quota";

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
  const [storage, usage] = await Promise.all([
    getWorkspaceStorageQuota(workspaceId),
    db.select({ bytes: sql<number>`coalesce(sum(${filesTable.sizeBytes}), 0)` }).from(filesTable).where(eq(filesTable.workspaceId, workspaceId)),
  ]);
  const usedBytes = Number(usage[0]?.bytes ?? 0);

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
          subtitle={t("Kelola berkas workspace-mu", "Manage your workspace files")}
        />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="lg:col-span-1 h-fit lg:sticky lg:top-4">
          <CardContent className="pt-5">
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

        <div className="lg:col-span-3 space-y-4 min-w-0">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <div className="flex items-center justify-between"><span>{t("Storage terpakai", "Storage used")}</span><strong>{(usedBytes / 1024 ** 3).toFixed(2)} GB / {(storage.maxBytes / 1024 ** 3).toFixed(2)} GB</strong></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#6647F0]" style={{ width: `${Math.min(100, (usedBytes / Math.max(1, storage.maxBytes)) * 100)}%` }} /></div>
              <p className="text-xs text-muted-foreground">{t("Tersedia", "Available")}: {(Math.max(0, storage.maxBytes - usedBytes) / 1024 ** 3).toFixed(2)} GB</p>
              <p className="text-xs text-muted-foreground">{t("Batas workspace", "Workspace limit")}: {(storage.maxBytes / 1024 ** 3).toFixed(2)} GB</p>
            </CardContent>
          </Card>
          {children}
        </div>
      </div>
    </div>
  );
}
