import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";

function brandingLogoKey(workspaceId: string) {
  return `workspaces/${workspaceId}/branding/logo`;
}

/**
 * Public logo stream for invoice PDF + client preview.
 * 1) Try R2 branding object for workspace
 * 2) Fallback: if logoUrl is external absolute URL, redirect
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await ctx.params;
    if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
      return NextResponse.json({ error: "invalid workspace" }, { status: 400 });
    }

    const [ws] = await db
      .select({ logoUrl: workspaces.logoUrl })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!ws) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    // Prefer uploaded R2 object
    try {
      const obj = await r2.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: brandingLogoKey(workspaceId),
        }),
      );
      if (obj.Body) {
        const bytes = Buffer.from(await obj.Body.transformToByteArray());
        return new NextResponse(bytes, {
          status: 200,
          headers: {
            "Content-Type": obj.ContentType || "image/png",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            "Content-Length": String(bytes.length),
          },
        });
      }
    } catch {
      // fall through to external logoUrl
    }

    const logoUrl = ws.logoUrl?.trim();
    if (logoUrl && /^https?:\/\//i.test(logoUrl) && !logoUrl.includes("/api/public/workspace-logo/")) {
      return NextResponse.redirect(logoUrl, 302);
    }

    return NextResponse.json({ error: "no logo" }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
