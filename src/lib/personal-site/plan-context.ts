import { eq } from "drizzle-orm";
import { db } from "@/db";
import { personalSites, users, workspaces } from "@/db/schema";

export async function getPersonalSiteOwnerPlanContext(workspaceId: string) {
  const [row] = await db
    .select({
      plan: users.plan,
      planExpiresAt: users.planExpiresAt,
      workspaceSlug: workspaces.slug,
    })
    .from(workspaces)
    .innerJoin(users, eq(users.id, workspaces.ownerId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return row ?? null;
}

export async function listPersonalSiteRows() {
  return db
    .select({
      id: personalSites.id,
      workspaceId: personalSites.workspaceId,
      userId: personalSites.userId,
      slug: personalSites.slug,
      published: personalSites.published,
      plan: users.plan,
      planExpiresAt: users.planExpiresAt,
      workspaceSlug: workspaces.slug,
      ownerId: workspaces.ownerId,
    })
    .from(personalSites)
    .innerJoin(workspaces, eq(workspaces.id, personalSites.workspaceId))
    .innerJoin(users, eq(users.id, workspaces.ownerId));
}

export type PersonalSiteOwnerPlanContext = NonNullable<
  Awaited<ReturnType<typeof getPersonalSiteOwnerPlanContext>>
>;
export type PersonalSiteRow = Awaited<ReturnType<typeof listPersonalSiteRows>>[number];
