import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable, assertClientInWorkspace, assertProjectInWorkspace } from "@/lib/access";
import { r2, R2_BUCKET, buildFileKey } from "@/lib/r2";
import { completeUpload } from "@/lib/actions/files";
import { validateUploadedFile } from "@/lib/file-validation";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Same-origin file upload proxy.
 * Avoids browser CSP/CORS failures on direct R2 presigned PUT.
 * Multipart fields: file, workspaceId, clientId?, projectId?, folderId?, visibility?, fileType?
 */
export async function POST(req: NextRequest) {
  try {
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
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = /not found|forbidden|unauthorized|access/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
