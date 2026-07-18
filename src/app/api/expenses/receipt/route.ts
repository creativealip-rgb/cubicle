import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { r2, R2_BUCKET } from "@/lib/r2";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/**
 * Same-origin expense receipt upload proxy.
 * Multipart: file, workspaceId, expenseId?
 * Returns { storageKey } for the form to attach to create/update expense.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = requireUser(session?.user);

    const form = await req.formData();
    const file = form.get("file");
    const workspaceId = String(form.get("workspaceId") ?? "");
    const expenseId = String(form.get("expenseId") ?? "") || undefined;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Receipt must be under 10MB" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "Receipt must be image (jpg/png/webp/gif) or PDF" },
        { status: 400 },
      );
    }

    await assertWorkspaceWritable(db, user.id, workspaceId);

    const id = expenseId || randomUUID();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `workspaces/${workspaceId}/expenses/${id}/${safeFilename}`;
    const body = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: mime,
        ContentLength: body.length,
      }),
    );

    return NextResponse.json({ ok: true, storageKey });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = /not found|forbidden|unauthorized|access/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
