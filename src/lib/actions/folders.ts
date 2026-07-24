"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { folders, files } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  assertWorkspaceMember,
  assertWorkspaceWritable,
  assertClientInWorkspace,
  assertProjectInWorkspace,
} from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { assertFolderScopeMatches, getFolderDeleteBlocker } from "@/lib/file-manager-rules";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const createFolderSchema = z.object({
  name: z.string().min(1, "Nama folder wajib diisi").max(120),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

async function assertFolderInWorkspace(workspaceId: string, folderId: string) {
  const [folder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.workspaceId, workspaceId)))
    .limit(1);
  if (!folder) throw new Error("Folder tidak ditemukan");
  return folder;
}

export async function createFolder(input: z.infer<typeof createFolderSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = createFolderSchema.parse(input);
  if (parsed.clientId) {
    await assertClientInWorkspace(db, user.id, parsed.workspaceId, parsed.clientId);
  }
  if (parsed.projectId) {
    await assertProjectInWorkspace(db, user.id, parsed.workspaceId, parsed.projectId);
  }
  if (parsed.parentId) {
    const parent = await assertFolderInWorkspace(parsed.workspaceId, parsed.parentId);
    assertFolderScopeMatches(
      { clientId: parent.clientId, projectId: parent.projectId },
      { clientId: parsed.clientId || null, projectId: parsed.projectId || null },
    );
  }

  const [folder] = await db
    .insert(folders)
    .values({
      workspaceId: parsed.workspaceId,
      clientId: parsed.clientId || null,
      projectId: parsed.projectId || null,
      parentId: parsed.parentId || null,
      name: parsed.name.trim(),
    })
    .returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_folder", "folder", folder.id);
  return folder;
}

const renameFolderSchema = z.object({
  folderId: z.string().uuid(),
  name: z.string().min(1, "Nama folder wajib diisi").max(120),
});

export async function renameFolder(input: z.infer<typeof renameFolderSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = renameFolderSchema.parse(input);
  await assertFolderInWorkspace(workspaceId, parsed.folderId);

  const [folder] = await db
    .update(folders)
    .set({ name: parsed.name.trim() })
    .where(and(eq(folders.id, parsed.folderId), eq(folders.workspaceId, workspaceId)))
    .returning();

  await writeActivityLog(workspaceId, user.id, "renamed_folder", "folder", folder.id);
  return folder;
}

export async function deleteFolder(folderId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  await assertFolderInWorkspace(workspaceId, folderId);

  // Cegah hapus folder yang masih ada isinya (sub-folder atau file)
  const [childFolder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.parentId, folderId), eq(folders.workspaceId, workspaceId)))
    .limit(1);
  const [childFile] = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.folderId, folderId), eq(files.workspaceId, workspaceId)))
    .limit(1);
  const blocker = getFolderDeleteBlocker({
    hasChildFolder: Boolean(childFolder),
    hasChildFile: Boolean(childFile),
  });
  if (blocker) {
    return { success: false as const, error: blocker };
  }

  await db.delete(folders).where(eq(folders.id, folderId));
  await writeActivityLog(workspaceId, user.id, "deleted_folder", "folder", folderId);
  return { success: true as const };
}

export async function listFolders(
  workspaceId: string,
  scope?: { clientId?: string; projectId?: string; parentId?: string | null },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceMember(db, user.id, workspaceId);

  const conditions = [eq(folders.workspaceId, workspaceId)];
  if (scope?.clientId) conditions.push(eq(folders.clientId, scope.clientId));
  if (scope?.projectId) conditions.push(eq(folders.projectId, scope.projectId));
  if (scope?.parentId === null) conditions.push(isNull(folders.parentId));
  else if (scope?.parentId) conditions.push(eq(folders.parentId, scope.parentId));

  return db
    .select({
      id: folders.id,
      name: folders.name,
      parentId: folders.parentId,
      clientId: folders.clientId,
      projectId: folders.projectId,
      createdAt: folders.createdAt,
    })
    .from(folders)
    .where(and(...conditions))
    .orderBy(asc(folders.name));
}
