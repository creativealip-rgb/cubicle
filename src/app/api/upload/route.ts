import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "form-assets");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || ".bin";
    const safeHash = crypto.randomBytes(16).toString("hex");
    const fileName = `${Date.now()}-${safeHash}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/form-assets/${fileName}`;

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
