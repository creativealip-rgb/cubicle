import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { r2, R2_BUCKET } from "@/lib/r2";
import { writeActivityLog } from "@/lib/actions/activity";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

function brandingLogoKey(workspaceId: string) {
  return `workspaces/${workspaceId}/branding/logo`;
}

function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "https://cubiqlo.com"
  ).replace(/\/$/, "");
}

function publicLogoUrl(workspaceId: string) {
  return `${appOrigin()}/api/public/workspace-logo/${workspaceId}?v=${Date.now()}`;
}

/**
 * Upload workspace invoice logo (same-origin → R2).
 * Multipart: file
 * Returns { ok, logoUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = requireUser(session?.user);
    const workspaceId = await getWorkspaceForCurrentUser();
    await assertWorkspaceWritable(db, user.id, workspaceId);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Logo max 2MB" }, { status: 400 });
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "Logo must be image (png/jpg/webp/gif/svg)" },
        { status: 400 },
      );
    }

    const body = Buffer.from(await file.arrayBuffer());
    const key = brandingLogoKey(workspaceId);

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: mime,
        ContentLength: body.length,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const logoUrl = publicLogoUrl(workspaceId);
    await db
      .update(workspaces)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    await writeActivityLog(workspaceId, user.id, "uploaded_workspace_logo", "workspace", workspaceId);

    return NextResponse.json({ ok: true, logoUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = /not found|forbidden|unauthorized|access/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Remove workspace logo. */
export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = requireUser(session?.user);
    const workspaceId = await getWorkspaceForCurrentUser();
    await assertWorkspaceWritable(db, user.id, workspaceId);

    try {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: brandingLogoKey(workspaceId),
        }),
      );
    } catch {
      // ignore missing object
    }

    await db
      .update(workspaces)
      .set({ logoUrl: null, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    await writeActivityLog(workspaceId, user.id, "removed_workspace_logo", "workspace", workspaceId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    const status = /not found|forbidden|unauthorized|access/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
