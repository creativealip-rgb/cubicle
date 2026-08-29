import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_CONFIGURED } from "@/lib/r2";
import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canAccessFile } from "@/app/api/files/[fileId]/download/route";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!R2_CONFIGURED) return new NextResponse("Storage unavailable", { status: 503 });

  const { key } = await params;
  const objectKey = key.join("/");
  if (!objectKey || objectKey.includes("..")) {
    return new NextResponse("Invalid key", { status: 400 });
  }

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.storageKey, objectKey))
    .limit(1);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const allowed = await canAccessFile(file, request.nextUrl.searchParams.get("token"));
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  try {
    const object = await r2.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: objectKey }),
    );
    if (!object.Body) return new NextResponse("Not found", { status: 404 });

    const ext = "." + objectKey.split(".").pop()?.toLowerCase();
    return new NextResponse(Buffer.from(await object.Body.transformToByteArray()), {
      headers: {
        "Content-Type": object.ContentType || MIME_MAP[ext] || "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

export const dynamic = "force-dynamic";
