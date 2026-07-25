import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { db } from "@/db";
import {
  clients,
  files,
  portalVisits,
  projects,
  workspaceMembers,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSignedDownloadUrl } from "@/lib/r2";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";

async function canAccessFile(
  file: typeof files.$inferSelect,
  token: string | null,
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user?.id) {
    const [memberFile] = await db
      .select({ id: files.id })
      .from(files)
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, files.workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .where(eq(files.id, file.id))
      .limit(1);

    if (memberFile) return true;
  }

  if (!token || file.visibility !== "client") return false;

  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Project-scoped client-visible file
  if (file.projectId) {
    const [portalFile] = await db
      .select({ id: files.id })
      .from(files)
      .innerJoin(projects, eq(projects.id, files.projectId))
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(
        and(
          eq(files.id, file.id),
          eq(files.visibility, "client"),
          eq(projects.clientVisible, true),
          eq(clients.portalEnabled, true),
          eq(clients.portalTokenHash, tokenHash),
          isNull(clients.portalTokenRevokedAt),
          or(
            isNull(clients.portalTokenExpiresAt),
            gt(clients.portalTokenExpiresAt, new Date()),
          ),
        ),
      )
      .limit(1);
    if (portalFile) return true;
  }

  // Client-level file (no project) shared via portal
  if (file.clientId) {
    const [clientFile] = await db
      .select({ id: files.id })
      .from(files)
      .innerJoin(clients, eq(clients.id, files.clientId))
      .where(
        and(
          eq(files.id, file.id),
          eq(files.visibility, "client"),
          eq(clients.portalEnabled, true),
          eq(clients.portalTokenHash, tokenHash),
          isNull(clients.portalTokenRevokedAt),
          or(
            isNull(clients.portalTokenExpiresAt),
            gt(clients.portalTokenExpiresAt, new Date()),
          ),
        ),
      )
      .limit(1);
    if (clientFile) return true;
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const limited = await enforceRateLimitResponse(request, "public:file-download", { limit: 120, windowSec: 60 }, { failureMode: "open" });
  if (limited) return limited;
  const { fileId } = await params;

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token");
  const allowed = await canAccessFile(file, token);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await getSignedDownloadUrl(file.storageKey);

  // A portal file is viewed only after a successful token-authorized download.
  if (token) {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const [portalClient] = await db
        .select({
          id: clients.id,
          name: clients.name,
          companyName: clients.companyName,
        })
        .from(clients)
        .where(
          and(
            eq(clients.workspaceId, file.workspaceId),
            eq(clients.portalEnabled, true),
            eq(clients.portalTokenHash, tokenHash),
            isNull(clients.portalTokenRevokedAt),
            or(
              isNull(clients.portalTokenExpiresAt),
              gt(clients.portalTokenExpiresAt, new Date()),
            ),
          ),
        )
        .limit(1);

      if (portalClient) {
        const [firstVisit] = await db
          .select({ id: portalVisits.id })
          .from(portalVisits)
          .where(
            and(
              eq(portalVisits.resourceType, "file"),
              eq(portalVisits.resourceId, file.id),
            ),
          )
          .limit(1);
        const requestHeaders = await headers();
        await db.insert(portalVisits).values({
          workspaceId: file.workspaceId,
          clientId: portalClient.id,
          resourceType: "file",
          resourceId: file.id,
          ipAddress: requestHeaders.get("x-forwarded-for") || undefined,
          userAgent: requestHeaders.get("user-agent") || undefined,
        });
        await db
          .update(files)
          .set({ lastViewedAt: new Date() })
          .where(eq(files.id, file.id));

        if (!firstVisit) {
          const { notifyWorkspaceMembers } =
            await import("@/lib/in-app-notifications");
          await notifyWorkspaceMembers(file.workspaceId, {
            type: "file_viewed",
            title: `${portalClient.companyName || portalClient.name} melihat ${file.name}`,
            body: "File pertama kali dibuka dari portal",
            link: `/app/files?focus=${file.id}`,
            entityType: "file",
            entityId: file.id,
            actorId: null,
          });
        }
      }
    } catch {
      // Download tetap berjalan bila analytics/notification gagal.
    }
  }

  return NextResponse.redirect(url);
}
