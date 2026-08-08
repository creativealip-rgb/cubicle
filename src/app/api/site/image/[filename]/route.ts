import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Serve uploaded site images.
 * GET /api/site/image/[filename]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params;

    // Sanitize filename — only allow UUID-style names with extensions
    if (!/^[a-f0-9-]+\.[a-z]+$/i.test(filename)) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const filepath = join(process.cwd(), "public", "uploads", "site-images", filename);

    if (!existsSync(filepath)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const buffer = await readFile(filepath);
    const ext = "." + filename.split(".").pop()?.toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
