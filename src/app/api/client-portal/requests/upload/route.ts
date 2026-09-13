import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { portalRequests } from "@/db/schema";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { validateUploadedFile } from "@/lib/file-validation";
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";
import { getUploadQuotaLimits, safeUploadErrorResponse, validateContentLength } from "@/lib/upload-safety";
import { readRequestBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/upload-request-limit";
import { promoteBufferedUpload } from "@/lib/upload-buffered-saga";

const MAX_SIZE = getUploadQuotaLimits("team").maxFileBytes;

export async function POST(req: NextRequest) {
  if (!validateContentLength(req.headers.get("content-length"), MAX_SIZE)) return NextResponse.json({ error: "Upload too large" }, { status: 413 });
  const limited = await enforceRateLimitResponse(req, "portal:request-upload", { limit: 10, windowSec: 300 });
  if (limited) return limited;
  try {
    const limitedRequest = await readRequestBodyWithinLimit(req, MAX_SIZE + 1024 * 1024);
    const form = await limitedRequest.formData();
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

    const body = Buffer.from(await upload.arrayBuffer());
    const validation = validateUploadedFile(upload.name, body.subarray(0, 16));
    if (!validation.ok) return NextResponse.json({ error: validation.reason ?? "File tidak valid" }, { status: 400 });
    const { file: fileRow } = await promoteBufferedUpload({ workspaceId: client.workspaceId, actorType: "portal", actorId: client.id, destinationId: requestId, body, mime: upload.type || "application/octet-stream", name: upload.name, visibility: "client", fileType: "deliverable", uploadedBy: null, clientId: client.id, projectId: requestRow.projectId, idempotencyKey: String(form.get("idempotencyKey") ?? "").trim() || undefined });
    await db.update(portalRequests).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(portalRequests.id, requestId), eq(portalRequests.clientId, client.id), eq(portalRequests.workspaceId, client.workspaceId)));
    return NextResponse.json({ file: fileRow });
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) return NextResponse.json({ error: err.message }, { status: err.status });
    const safe = safeUploadErrorResponse(err);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
}
