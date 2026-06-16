"use server";

import { db } from "@/db";
import { activityLogs } from "@/db/schema";

export async function writeActivityLog(
  workspaceId: string,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(activityLogs).values({
    workspaceId,
    actorId,
    action,
    entityType,
    entityId: entityId || null,
    metadata,
  });
}
