import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable, assertClientInWorkspace, assertProjectInWorkspace, assertFolderInWorkspace } from "@/lib/access";
import { r2, R2_BUCKET, buildFileKey, deleteStoredFile } from "@/lib/r2";
import { assertUploadQuota, getUploadQuotaLimits, safeUploadErrorResponse, validateContentLength } from "@/lib/upload-safety";
import { completeUpload } from "@/lib/actions/files";
import { validateUploadedFile } from "@/lib/file-validation";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_BYTES = getUploadQuotaLimits("team").maxFileBytes;

/**
 * Same-origin file upload proxy.
 * Avoids browser CSP/CORS failures on direct R2 presigned PUT.
 * Multipart fields: file, workspaceId, clientId?, projectId?, folderId?, visibility?, fileType?
 */
export async function POST(req: NextRequest) {
  let uploadedObject: string | null = null;
  try {
    if (!validateContentLength(req.headers.get("content-length"), MAX_BYTES)) return NextResponse.json({ error: "Upload too large" }, { status: 413 });
    const session = await auth.api.getSession({ headers: await headers() });
    const user = requireUser(session?.user);

    const form = await req.formData();
    const file = form.get("file");
    const workspaceId = String(form.get("workspaceId") ?? "");
    const clientId = String(form.get("clientId") ?? "") || undefined;
    const projectId = String(form.get("projectId") ?? "") || undefined;
    const folderId = String(form.get("folderId") ?? "") || undefined;
    const visibility = (String(form.get("visibility") ?? "internal") as "internal" | "client");
    const fileType = (String(form.get("fileType") ?? "working_file") as "working_file" | "deliverable");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be under 25MB" }, { status: 400 });
    }

    await assertWorkspaceWritable(db, user.id, workspaceId);
    if (clientId) await assertClientInWorkspace(db, user.id, workspaceId, clientId);
    if (projectId) await assertProjectInWorkspace(db, user.id, workspaceId, projectId);
    if (folderId) await assertFolderInWorkspace(db, user.id, workspaceId, folderId);
    await assertUploadQuota(workspaceId, file.size, clientId);

    const tempFileId = randomUUID();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = buildFileKey(workspaceId, tempFileId, safeFilename);
    const mime = file.type || "application/octet-stream";
    const body = Buffer.from(await file.arrayBuffer());
    const validation = validateUploadedFile(file.name, body.subarray(0, 16));
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.reason ?? "File tidak valid" },
        { status: 400 },
      );
    }

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: mime,
        ContentLength: body.length,
      }),
    );

    uploadedObject = storageKey;
    const record = await completeUpload({
      name: file.name,
      storageKey,
      mimeType: mime,
      sizeBytes: file.size,
      workspaceId,
      clientId,
      projectId,
      folderId,
      visibility,
      fileType,
    });

    return NextResponse.json({ ok: true, file: record });
  } catch (err: unknown) {
    if (uploadedObject) await deleteStoredFile(uploadedObject).catch(() => undefined);
    const safe = safeUploadErrorResponse(err);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}
