import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { files as filesTable, clients, projects, folders as foldersTable } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { FileList } from "@/components/files/file-list";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getCurrentLang, createT } from "@/lib/i18n";

/** File list + breadcrumb only — tree lives in layout (no full-page flash). */
export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string; folderId?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const sp = await searchParams;
  const clientId = sp.clientId;
  const projectId = sp.projectId;
  const folderId = sp.folderId;

  const { users } = await import("@/db/schema");
  const conditions = [eq(filesTable.workspaceId, workspaceId)];
  if (clientId) conditions.push(eq(filesTable.clientId, clientId));
  if (projectId) conditions.push(eq(filesTable.projectId, projectId));
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

  const clientList = clientId
    ? await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(and(eq(clients.workspaceId, workspaceId), eq(clients.id, clientId)))
        .limit(1)
    : [];

  const projectList = projectId
    ? await db
        .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
        .from(projects)
        .where(and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId)))
        .limit(1)
    : [];

  const folderList = await db
    .select({
      id: foldersTable.id,
      name: foldersTable.name,
      parentId: foldersTable.parentId,
    })
    .from(foldersTable)
    .where(eq(foldersTable.workspaceId, workspaceId));

  const crumbs: { label: string; href: string }[] = [
    { label: t("Semua File", "All Files"), href: "/app/files" },
  ];
  const activeClient = clientList[0];
  const activeProject = projectList[0];
  if (activeClient) {
    crumbs.push({ label: activeClient.name, href: `/app/files?clientId=${activeClient.id}` });
  }
  if (activeProject) {
    crumbs.push({
      label: activeProject.name,
      href: `/app/files?clientId=${activeClient?.id ?? ""}&projectId=${activeProject.id}`,
    });
  }
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
    <>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        {crumbs.map((crumb, i) => (
          <span key={`${crumb.href}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} scroll={false} className="hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
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
    </>
  );
}
