import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files, portalRequests } from "@/db/schema";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { buildFileKey, R2_BUCKET, r2, deleteStoredFile } from "@/lib/r2";
import { validateUploadedFile } from "@/lib/file-validation";
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";
import { assertUploadQuota, getUploadQuotaLimits, safeUploadErrorResponse, validateContentLength } from "@/lib/upload-safety";

const MAX_SIZE = getUploadQuotaLimits("team").maxFileBytes;

export async function POST(req: NextRequest) {
  let uploadedObject: string | null = null;
  if (!validateContentLength(req.headers.get("content-length"), MAX_SIZE)) return NextResponse.json({ error: "Upload too large" }, { status: 413 });
  const limited = await enforceRateLimitResponse(req, "portal:request-upload", { limit: 10, windowSec: 300 });
  if (limited) return limited;
  try {
    const form = await req.formData();
    const token = String(form.get("token") ?? "");
    const requestId = String(form.get("requestId") ?? "");
    const upload = form.get("file");

    if (!token || !requestId) {
      return NextResponse.json({ error: "Token and requestId are required" }, { status: 400 });
    }
    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (upload.size <= 0 || upload.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 25MB" }, { status: 400 });
    }

    const client = await getClientPortalAccess(token);
    const [requestRow] = await db
      .select({ id: portalRequests.id, projectId: portalRequests.projectId })
      .from(portalRequests)
      .where(
        and(
          eq(portalRequests.id, requestId),
          eq(portalRequests.clientId, client.id),
          eq(portalRequests.workspaceId, client.workspaceId),
        ),
      )
      .limit(1);

    if (!requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await assertUploadQuota(client.workspaceId, upload.size, client.id);
    const body = Buffer.from(await upload.arrayBuffer());

    // Validate real content (extension allowlist + magic bytes). This endpoint
    // is public/token-based, so the client MIME type and filename are untrusted.
    const validation = validateUploadedFile(upload.name, body.subarray(0, 16));
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason ?? "File tidak valid" }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const safeName = upload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = buildFileKey(client.workspaceId, fileId, safeName);

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: upload.type || "application/octet-stream",
      }),
    );

    uploadedObject = storageKey;
    const fileRow = await db.transaction(async (tx) => {
      const [createdFile] = await tx
        .insert(files)
        .values({
          workspaceId: client.workspaceId,
          clientId: client.id,
          projectId: requestRow.projectId,
          name: upload.name,
          storageKey,
          mimeType: upload.type || null,
          sizeBytes: upload.size,
          visibility: "client",
          fileType: "deliverable",
          uploadedBy: null,
        })
        .returning();

      await tx
        .update(portalRequests)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(portalRequests.id, requestId));

      return createdFile;
    });

    return NextResponse.json({ file: fileRow });
  } catch (err) {
    if (uploadedObject) await deleteStoredFile(uploadedObject).catch(() => undefined);
    const safe = safeUploadErrorResponse(err);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}
