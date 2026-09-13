import { createHash, randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable, assertClientInWorkspace, assertProjectInWorkspace, assertFolderInWorkspace } from "@/lib/access";
import { r2, R2_BUCKET, deleteStoredFile } from "@/lib/r2";
import { getUploadQuotaLimits, safeUploadErrorResponse, validateContentLength } from "@/lib/upload-safety";
import { validateUploadedFile } from "@/lib/file-validation";
import { claimValidation, confirmUpload, createUploadIntent } from "@/lib/upload-intent-service";
import { runUploadPromotionSaga } from "@/lib/upload-saga-coordinator";

export const runtime = "nodejs";
const MAX_BYTES = getUploadQuotaLimits("team").maxFileBytes;
const SAGA_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  let quarantineKey: string | null = null;
  let promotionStarted = false;
  try {
    if (!validateContentLength(req.headers.get("content-length"), MAX_BYTES)) return NextResponse.json({ error: "Upload too large" }, { status: 413 });
    const session = await auth.api.getSession({ headers: await headers() });
    const user = requireUser(session?.user);
    const form = await req.formData();
    const file = form.get("file");
    const workspaceId = String(form.get("workspaceId") ?? "");
    const idempotencyKey = String(form.get("idempotencyKey") ?? "");
    const clientId = String(form.get("clientId") ?? "") || undefined;
    const projectId = String(form.get("projectId") ?? "") || undefined;
    const folderId = String(form.get("folderId") ?? "") || undefined;
    const visibility = String(form.get("visibility") ?? "internal") as "internal" | "client";
    const fileType = String(form.get("fileType") ?? "working_file") as "working_file" | "deliverable";
    if (!workspaceId || !idempotencyKey || !(file instanceof File)) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey) || !["internal", "client"].includes(visibility) || !["working_file", "deliverable"].includes(fileType)) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File must be under 25MB" }, { status: 400 });
    await assertWorkspaceWritable(db, user.id, workspaceId);
    if (clientId) await assertClientInWorkspace(db, user.id, workspaceId, clientId);
    if (projectId) await assertProjectInWorkspace(db, user.id, workspaceId, projectId);
    if (folderId) await assertFolderInWorkspace(db, user.id, workspaceId, folderId);
    const body = Buffer.from(await file.arrayBuffer());
    const validation = validateUploadedFile(file.name, body.subarray(0, 16));
    if (!validation.ok) return NextResponse.json({ error: validation.reason ?? "File tidak valid" }, { status: 400 });
    const mime = file.type || "application/octet-stream";
    if (!SAGA_MIME_TYPES.has(mime)) return NextResponse.json({ error: "File type is not supported by secure upload" }, { status: 400 });
    const intent = await createUploadIntent({ workspaceId, actorType: "user", actorId: user.id, destinationType: "workspace_file", destinationId: folderId ?? projectId ?? clientId ?? "root", idempotencyKey, expectedMime: mime, expectedBytes: body.length, maxBytes: MAX_BYTES, expectedSha256: createHash("sha256").update(body).digest("hex"), expiresAt: new Date(Date.now() + 15 * 60_000) });
    quarantineKey = intent.quarantineKey;
    const put = await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: intent.quarantineKey, Body: body, ContentType: mime, ContentLength: body.length }));
    const uploaded = await confirmUpload(intent.id, workspaceId, intent.version, { etag: put.ETag ?? "", versionId: put.VersionId });
    const workerId = `upload-api-${randomUUID()}`;
    const validating = await claimValidation(uploaded.id, workspaceId, uploaded.version, workerId, new Date(Date.now() + 60_000));
    promotionStarted = true;
    const result = await runUploadPromotionSaga({ intentId: validating.id, workspaceId, version: validating.version, workerId, name: file.name, visibility, fileType, uploadedBy: user.id, clientId, projectId, folderId });
    quarantineKey = null;
    return NextResponse.json({ ok: true, file: result.file });
  } catch (error) {
    console.error("[files/upload] failed", error);
    if (quarantineKey && !promotionStarted) await deleteStoredFile(quarantineKey).catch(() => undefined);
    const safe = safeUploadErrorResponse(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}
