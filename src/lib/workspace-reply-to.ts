import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";

/**
 * Resolve Reply-To for outbound workspace emails.
 * Priority: explicit replyToEmail → billingEmail → owner email → undefined
 */
export async function resolveWorkspaceReplyTo(
  workspaceId: string,
): Promise<string | undefined> {
  const [ws] = await db
    .select({
      replyToEmail: workspaces.replyToEmail,
      billingEmail: workspaces.billingEmail,
      ownerId: workspaces.ownerId,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws) return undefined;

  const explicit = ws.replyToEmail?.trim();
  if (explicit) return explicit;

  const billing = ws.billingEmail?.trim();
  if (billing) return billing;

  if (!ws.ownerId) return undefined;

  const [owner] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, ws.ownerId))
    .limit(1);

  const ownerEmail = owner?.email?.trim();
  return ownerEmail || undefined;
}

/**
 * Pure resolve when workspace row + optional owner email already loaded.
 * Priority: replyToEmail → billingEmail → ownerEmail → undefined
 */
export function pickReplyTo(opts: {
  replyToEmail?: string | null;
  billingEmail?: string | null;
  ownerEmail?: string | null;
}): string | undefined {
  const explicit = opts.replyToEmail?.trim();
  if (explicit) return explicit;
  const billing = opts.billingEmail?.trim();
  if (billing) return billing;
  const owner = opts.ownerEmail?.trim();
  return owner || undefined;
}
