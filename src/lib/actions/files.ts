"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { files, workspaces, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { getSignedUploadUrl as getR2UploadUrl, buildFileKey } from "@/lib/r2";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const uploadUrlReqSchema = z.object({
  fileName: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().positive().max(25 * 1024 * 1024, "File must be under 25MB"),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  visibility: z.enum(["internal", "client"]).default("internal"),
  fileType: z.enum(["working_file", "deliverable"]).default("working_file"),
});

const completeUploadReqSchema = z.object({
  name: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  visibility: z.enum(["internal", "client"]).default("internal"),
  fileType: z.enum(["working_file", "deliverable"]).default("working_file"),
});

export async function getSignedUploadUrl(
  input: z.infer<typeof uploadUrlReqSchema>,
): Promise<{ uploadUrl: string; storageKey: string; tempFileId: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = uploadUrlReqSchema.parse(input);

  const crypto = await import("crypto");
  const tempFileId = crypto.randomUUID();
  const safeFilename = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = buildFileKey(parsed.workspaceId, tempFileId, safeFilename);

  const url = await getR2UploadUrl(storageKey, parsed.mime, 300);

  return { uploadUrl: url, storageKey, tempFileId };
}

export async function completeUpload(input: z.infer<typeof completeUploadReqSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = completeUploadReqSchema.parse(input);

  const [file] = await db.insert(files).values({
    workspaceId: parsed.workspaceId,
    clientId: parsed.clientId || null,
    projectId: parsed.projectId || null,
    folderId: parsed.folderId || null,
    name: parsed.name,
    storageKey: parsed.storageKey,
    mimeType: parsed.mimeType || null,
    sizeBytes: parsed.sizeBytes || null,
    visibility: parsed.visibility,
    fileType: parsed.fileType,
    uploadedBy: user.id,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "uploaded_file", "file", file.id);
  return file;
}

export async function deleteFile(fileId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.workspaceId, workspaceId)))
    .limit(1);

  if (!file) throw new Error("File not found");

  await db.delete(files).where(eq(files.id, fileId));
  await writeActivityLog(workspaceId, user.id, "deleted_file", "file", fileId);
  return { success: true };
}

export async function listFiles(workspaceId: string, clientId?: string, projectId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceMember(db, user.id, workspaceId);

  const conditions = [eq(files.workspaceId, workspaceId)];
  if (clientId) conditions.push(eq(files.clientId, clientId));
  if (projectId) conditions.push(eq(files.projectId, projectId));

  const result = await db
    .select({
      id: files.id,
      name: files.name,
      storageKey: files.storageKey,
      mimeType: files.mimeType,
      sizeBytes: files.sizeBytes,
      visibility: files.visibility,
      fileType: files.fileType,
      clientId: files.clientId,
      projectId: files.projectId,
      folderId: files.folderId,
      uploadedBy: files.uploadedBy,
      uploaderName: users.name,
      createdAt: files.createdAt,
    })
    .from(files)
    .leftJoin(users, eq(users.id, files.uploadedBy))
    .where(and(...conditions))
    .orderBy(desc(files.createdAt));

  return result;
}
