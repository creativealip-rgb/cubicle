"use server";

import { db } from "@/db";
import { clients, portalAccessLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/portal-password";

export async function getClientPortalAccess(credential: string) {
  const value = credential.trim();
  if (!value) throw new Error("Invalid portal link");
  const tokenHash = createHash("sha256").update(value).digest("hex");
  const { enforceServerActionRateLimit } = await import("@/lib/distributed-rate-limit");
  await enforceServerActionRateLimit("portal:resolve", tokenHash, { limit: 60, windowSec: 60 });

  let client: typeof clients.$inferSelect | undefined;
  [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.portalTokenHash, tokenHash))
    .limit(1);

  // Password-protected portal mutations use slug + HttpOnly session, never raw bearer token.
  if (!client) {
    [client] = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.portalSlug, value),
          eq(clients.portalSlugEnabled, true),
        ),
      )
      .limit(1);
    const secret = process.env.BETTER_AUTH_SECRET;
    const session = (await cookies()).get(PORTAL_COOKIE)?.value;
    const unlocked = !!client && !!secret && !!session && !!client.portalPasswordHash
      && !!verifyPortalSession(session, client.id, client.portalSessionVersion, secret);
    if (!unlocked) client = undefined;
  }

  if (!client) throw new Error("Invalid portal link");
  if (!client.portalEnabled) throw new Error("Portal is disabled");
  if (client.portalTokenRevokedAt) throw new Error("Portal access has been revoked");
  if (client.portalTokenExpiresAt && new Date(client.portalTokenExpiresAt) < new Date()) {
    throw new Error("Portal link has expired");
  }

  // Don't expose token hash
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { portalTokenHash, ...safeClient } = client;
  return safeClient;
}

export async function logPortalAccess(params: {
  workspaceId?: string | null;
  clientId?: string | null;
  invoiceId?: string | null;
  tokenType: "client_portal" | "invoice_share";
  tokenHashPrefix?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.insert(portalAccessLogs).values({
    workspaceId: params.workspaceId || null,
    clientId: params.clientId || null,
    invoiceId: params.invoiceId || null,
    tokenType: params.tokenType,
    tokenHashPrefix: params.tokenHashPrefix || null,
    ipAddress: params.ipAddress || null,
    userAgent: params.userAgent || null,
  });
}
