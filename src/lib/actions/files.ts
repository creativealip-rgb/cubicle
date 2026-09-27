"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { files, uploadIntents, users, folders } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  requireUser,
  assertWorkspaceMember,
  assertWorkspaceWritable,
  assertClientInWorkspace,
  assertProjectInWorkspace,
  assertFolderInWorkspace,
} from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { deleteStoredFile } from "@/lib/r2";
import { reserveWorkspaceUploadTx, consumeWorkspaceUploadTx } from "@/lib/storage-quota";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

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

const updateFileMetaSchema = z.object({
  fileId: z.string().uuid(),
  visibility: z.enum(["internal", "client"]).optional(),
  fileType: z.enum(["working_file", "deliverable"]).optional(),
});

export async function completeUpload(input: z.infer<typeof completeUploadReqSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);

  const parsed = completeUploadReqSchema.parse(input);
  if (!parsed.storageKey.startsWith(`workspaces/${parsed.workspaceId}/`)) {
    throw new Error("Invalid storage key for workspace");
  }
  if (parsed.clientId) {
    await assertClientInWorkspace(db, user.id, parsed.workspaceId, parsed.clientId);
  }
  if (parsed.projectId) {
    await assertProjectInWorkspace(db, user.id, parsed.workspaceId, parsed.projectId);
  }
  if (parsed.folderId) {
    await assertFolderInWorkspace(db, user.id, parsed.workspaceId, parsed.folderId);
  }

  // Deliverable shared to client should be client-visible by default.
  const visibility =
    parsed.fileType === "deliverable" && parsed.visibility === "internal"
      ? "client"
      : parsed.visibility;

  // Insert the file row and enforce the workspace quota in the same
  // transaction: the reservation is held until the row commits, so a direct
  // completeUpload call can never bypass the workspace byte/file limits.
  const file = await db.transaction(async (tx) => {
    await reserveWorkspaceUploadTx(tx, parsed.workspaceId, parsed.sizeBytes ?? 0);
    const [inserted] = await tx.insert(files).values({
      workspaceId: parsed.workspaceId,
      clientId: parsed.clientId || null,
      projectId: parsed.projectId || null,
      folderId: parsed.folderId || null,
      name: parsed.name,
      storageKey: parsed.storageKey,
      mimeType: parsed.mimeType || null,
      sizeBytes: parsed.sizeBytes || null,
      visibility,
      fileType: parsed.fileType,
      uploadedBy: user.id,
    }).returning();
    await consumeWorkspaceUploadTx(tx, parsed.workspaceId, parsed.sizeBytes ?? 0);
    return inserted;
  });

  try {
    await writeActivityLog(parsed.workspaceId, user.id, "uploaded_file", "file", file.id);
  } catch {
    // Activity log is best-effort; the upload itself already committed.
  }
  revalidatePath("/app/files");
  return file;
}

export async function updateFileMeta(input: z.infer<typeof updateFileMetaSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = updateFileMetaSchema.parse(input);
  if (parsed.visibility === undefined && parsed.fileType === undefined) {
    throw new Error("Nothing to update");
  }

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, parsed.fileId), eq(files.workspaceId, workspaceId)))
    .limit(1);

  if (!file) throw new Error("File not found");

  const next: {
    visibility?: "internal" | "client";
    fileType?: "working_file" | "deliverable";
  } = {};
  if (parsed.visibility !== undefined) next.visibility = parsed.visibility;
  if (parsed.fileType !== undefined) next.fileType = parsed.fileType;

  // Switching to deliverable auto-opens to client unless explicitly kept internal.
  if (next.fileType === "deliverable" && next.visibility === undefined && file.visibility === "internal") {
    next.visibility = "client";
  }

  const [updated] = await db
    .update(files)
    .set(next)
    .where(and(eq(files.id, parsed.fileId), eq(files.workspaceId, workspaceId)))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_file_meta", "file", parsed.fileId, next);
  revalidatePath("/app/files");
  return updated;
}

export async function saveFileContent({
  fileId,
  content,
  excelData,
}: {
  fileId: string;
  content?: string;
  excelData?: Array<{ sheetName: string; rows: Array<Array<string | number | boolean | null>> }>;
}) {
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

  let buffer: Buffer;
  let newMime = file.mimeType;

  if (excelData && excelData.length > 0) {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    excelData.forEach((sheetData) => {
      const sheet = workbook.addWorksheet(sheetData.sheetName || "Sheet 1");
      sheetData.rows.forEach((row) => {
        sheet.addRow(row);
      });
    });

    const uint8 = await workbook.xlsx.writeBuffer();
    buffer = Buffer.from(uint8);
  } else if (content !== undefined) {
    buffer = Buffer.from(content, "utf-8");
  } else {
    throw new Error("No content to save");
  }

  // Upload updated buffer to R2
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { r2, R2_BUCKET } = await import("@/lib/r2");

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: file.storageKey,
      Body: buffer,
      ContentType: newMime || undefined,
    })
  );

  const newSizeBytes = buffer.length;

  const [updated] = await db
    .update(files)
    .set({
      sizeBytes: newSizeBytes,
    })
    .where(and(eq(files.id, fileId), eq(files.workspaceId, workspaceId)))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_file_content", "file", fileId, {
    sizeBytes: newSizeBytes,
  });

  revalidatePath("/app/files");
  return updated;
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

  await deleteStoredFile(file.storageKey);
  await db.transaction(async (tx) => {
    await tx.delete(uploadIntents).where(and(eq(uploadIntents.finalFileId, fileId), eq(uploadIntents.workspaceId, workspaceId)));
    await tx.delete(files).where(and(eq(files.id, fileId), eq(files.workspaceId, workspaceId)));
  });
  await writeActivityLog(workspaceId, user.id, "deleted_file", "file", fileId);
  revalidatePath("/app/files");
  return { success: true };
}

export async function bulkDeleteFiles(fileIds: string[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  if (!fileIds || fileIds.length === 0) return { success: true, count: 0 };

  const targetFiles = await db
    .select()
    .from(files)
    .where(and(inArray(files.id, fileIds), eq(files.workspaceId, workspaceId)));

  if (targetFiles.length === 0) return { success: true, count: 0 };

  for (const f of targetFiles) {
    try {
      await deleteStoredFile(f.storageKey);
    } catch (e) {
      console.error("Error deleting stored file:", e);
    }
  }

  const ids = targetFiles.map((f) => f.id);
  await db.transaction(async (tx) => {
    await tx.delete(uploadIntents).where(and(inArray(uploadIntents.finalFileId, ids), eq(uploadIntents.workspaceId, workspaceId)));
    await tx.delete(files).where(and(inArray(files.id, ids), eq(files.workspaceId, workspaceId)));
  });

  await writeActivityLog(workspaceId, user.id, "bulk_deleted_files", "file", ids[0], {
    count: ids.length,
    fileIds: ids,
  });

  revalidatePath("/app/files");
  return { success: true, count: ids.length };
}

export async function bulkMoveFiles(fileIds: string[], targetFolderId: string | null) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  if (!fileIds || fileIds.length === 0) return { success: true, count: 0 };

  if (targetFolderId) {
    const [targetFolder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, targetFolderId), eq(folders.workspaceId, workspaceId)))
      .limit(1);

    if (!targetFolder) throw new Error("Target folder not found");
  }

  const updated = await db
    .update(files)
    .set({ folderId: targetFolderId })
    .where(and(inArray(files.id, fileIds), eq(files.workspaceId, workspaceId)))
    .returning({ id: files.id });

  await writeActivityLog(workspaceId, user.id, "bulk_moved_files", "file", updated[0]?.id || "", {
    count: updated.length,
    targetFolderId,
  });

  revalidatePath("/app/files");
  return { success: true, count: updated.length };
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
