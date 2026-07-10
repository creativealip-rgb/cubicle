import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files, portalRequests } from "@/db/schema";
import { getClientPortalAccess } from "@/lib/actions/portal";
import { buildFileKey, R2_BUCKET, r2 } from "@/lib/r2";

const MAX_SIZE = 25 * 1024 * 1024;

// Whitelist of allowed file extensions for client uploads. Using an allow-list
// (rather than a block-list) prevents executables/scripts and other dangerous
// content from being stored and later served.
const ALLOWED_EXTENSIONS = new Set([
  // images
  "jpg", "jpeg", "png", "gif", "webp", "heic", "avif", "bmp", "tiff",
  // documents
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "md",
  // design
  "psd", "ai", "eps", "sketch", "fig", "xd",
  // archives
  "zip", "rar", "7z",
  // media
  "mp4", "mov", "webm", "mp3", "wav", "m4a",
]);

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export async function POST(req: NextRequest) {
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
    if (!ALLOWED_EXTENSIONS.has(getExtension(upload.name))) {
      return NextResponse.json(
        { error: "File type not allowed. Upload an image, document, archive, or media file." },
        { status: 400 },
      );
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

    const fileId = crypto.randomUUID();
    const safeName = upload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = buildFileKey(client.workspaceId, fileId, safeName);
    const body = Buffer.from(await upload.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: upload.type || "application/octet-stream",
      }),
    );

    const [fileRow] = await db
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

    await db
      .update(portalRequests)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(portalRequests.id, requestId));

    return NextResponse.json({ file: fileRow });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
