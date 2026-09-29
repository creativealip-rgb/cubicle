import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, projects, folders as foldersTable, files as filesTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
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
 * Clean Google Drive 2-column workspace layout with sticky sidebar and independent scroll.
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top Fixed Header */}
      <div className="shrink-0 pb-3">
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
      </div>

      {/* Main Drive Workspace Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Sticky Sidebar: Storage + Folders Tree */}
        <Card className="lg:col-span-1 h-full flex flex-col overflow-hidden rounded-2xl border-border/80 bg-card/60 shadow-xs">
          <CardContent className="p-4 flex flex-col h-full overflow-hidden">
            {/* Storage Quota Card */}
            <div className="shrink-0 mb-3 space-y-1.5 border-b pb-3 text-sm">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground font-medium">{t("Storage terpakai", "Storage used")}</span>
                <span className="tabular-nums text-muted-foreground font-mono">
                  <strong className="font-semibold text-foreground">{Number((usedBytes / 1024 ** 3).toFixed(2)).toLocaleString(lang === "en" ? "en-US" : "id-ID", { maximumFractionDigits: 2 })}</strong>
                  {" / "}
                  {Number((storage.maxBytes / 1024 ** 3).toFixed(2)).toLocaleString(lang === "en" ? "en-US" : "id-ID", { maximumFractionDigits: 2 })} GB
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.min(100, Math.round((usedBytes / Math.max(1, storage.maxBytes)) * 100))} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (usedBytes / Math.max(1, storage.maxBytes)) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">{t("Tersedia", "Available")}: {(Math.max(0, storage.maxBytes - usedBytes) / 1024 ** 3).toFixed(2)} GB · {t("Batas", "Limit")}: {(storage.maxBytes / 1024 ** 3).toFixed(2)} GB</p>
            </div>

            {/* Tree Navigation (Independent Scrollbar) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
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
            </div>
          </CardContent>
        </Card>

        {/* Right Main Panel: Sticky Toolbar + Scrollable File Canvas */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
