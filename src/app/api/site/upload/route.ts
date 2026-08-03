import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Site image upload. Uses R2 if configured, otherwise local storage.
 * FormData: file (image)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format: PNG, JPG, WebP, GIF" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const body = Buffer.from(await file.arrayBuffer());

    // Try R2 first
    const r2Configured = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_BUCKET_NAME;

    if (r2Configured) {
      try {
        const { r2, R2_BUCKET } = await import("@/lib/r2");
        const { PutObjectCommand } = await import("@aws-sdk/client-s3");
        const key = `site-images/${filename}`;
        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: file.type,
            ContentLength: body.length,
          }),
        );
        const publicUrl = process.env.R2_PUBLIC_URL
          ? `${process.env.R2_PUBLIC_URL}/${key}`
          : `/api/files/raw/${key}`;
        return NextResponse.json({ ok: true, url: publicUrl });
      } catch {
        // Fall through to local storage
      }
    }

    // Local storage fallback
    const uploadDir = join(process.cwd(), "public", "uploads", "site-images");
    await mkdir(uploadDir, { recursive: true });
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, body);

    return NextResponse.json({ ok: true, url: `/api/site/image/${filename}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
