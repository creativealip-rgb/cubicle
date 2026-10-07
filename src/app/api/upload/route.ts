import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Universal Form Asset & Image Upload.
 * Saves directly to public upload directory with clean API URL: /api/upload/[filename]
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const body = Buffer.from(await file.arrayBuffer());
    const rawExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const ext = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(rawExt) ? rawExt : "png";
    const filename = `${Date.now()}-${randomUUID()}.${ext}`;

    const uploadDir = join(process.cwd(), "public", "uploads", "form-assets");
    await mkdir(uploadDir, { recursive: true });
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, body);

    // Guaranteed working API route
    const publicUrl = `/api/upload/${filename}`;

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
