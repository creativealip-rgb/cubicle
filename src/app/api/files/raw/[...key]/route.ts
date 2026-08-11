import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_CONFIGURED } from "@/lib/r2";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!R2_CONFIGURED) return new NextResponse("Storage unavailable", { status: 503 });

  const { key } = await params;
  const objectKey = key.join("/");
  if (!objectKey || objectKey.includes("..")) {
    return new NextResponse("Invalid key", { status: 400 });
  }

  try {
    const object = await r2.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: objectKey }),
    );
    if (!object.Body) return new NextResponse("Not found", { status: 404 });

    const ext = "." + objectKey.split(".").pop()?.toLowerCase();
    return new NextResponse(Buffer.from(await object.Body.transformToByteArray()), {
      headers: {
        "Content-Type": object.ContentType || MIME_MAP[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

export const dynamic = "force-dynamic";
