import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getSignedDownloadUrl, r2, R2_BUCKET } from "@/lib/r2";
import { canAccessFile } from "../download/route";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file) {
    return new Response("Not Found", { status: 404 });
  }

  const hasAccess = await canAccessFile(file, token);
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  const range = request.headers.get("range");
  const isMedia =
    (file.mimeType && (file.mimeType.startsWith("video/") || file.mimeType.startsWith("audio/"))) ||
    file.name.endsWith(".mp4") ||
    file.name.endsWith(".webm") ||
    file.name.endsWith(".mov") ||
    file.name.endsWith(".mp3") ||
    file.name.endsWith(".wav");

  try {
    const s3Res = await r2.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: file.storageKey,
        Range: range || undefined,
      })
    );

    const stream = s3Res.Body?.transformToWebStream();
    if (!stream) {
      return new Response("Error streaming file", { status: 500 });
    }

    const responseHeaders = new Headers();
    if (s3Res.ContentType) responseHeaders.set("Content-Type", s3Res.ContentType);
    if (s3Res.ContentLength) responseHeaders.set("Content-Length", String(s3Res.ContentLength));
    if (s3Res.ContentRange) responseHeaders.set("Content-Range", s3Res.ContentRange);
    if (s3Res.AcceptRanges) responseHeaders.set("Accept-Ranges", s3Res.AcceptRanges);
    else responseHeaders.set("Accept-Ranges", "bytes");

    responseHeaders.set(
      "Content-Disposition",
      `inline; filename="${file.name.replace(/[\r\n"\\/]/g, "_")}"`
    );

    const status = s3Res.ContentRange ? 206 : 200;
    return new Response(stream as any, {
      status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    // Fallback redirect to signed URL
    const downloadUrl = await getSignedDownloadUrl(file.storageKey, 3600, file.name, {
      inline: true,
      contentType: file.mimeType || undefined,
    });
    return NextResponse.redirect(downloadUrl);
  }
}
