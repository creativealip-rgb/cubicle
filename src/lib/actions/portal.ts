"use server";

import { db } from "@/db";
import { clients, portalAccessLogs } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { createHash } from "crypto";

export async function getClientPortalAccess(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const slug = rawToken.trim().toLowerCase();

  const [client] = await db
    .select()
    .from(clients)
    .where(or(eq(clients.portalTokenHash, tokenHash), eq(clients.portalSlug, slug)))
    .limit(1);

  if (!client) throw new Error("Invalid portal link");
  if (client.portalSlug === slug && !client.portalSlugEnabled) throw new Error("Portal slug is disabled");
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
