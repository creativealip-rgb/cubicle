import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

/**
 * PERSONAL tools (notes / landing / journal) are owner-only.
 * Invited members/viewers get redirected instead of error card.
 */
export async function requireWorkspaceOwnerOrRedirect(
  fallback = "/app/dashboard",
): Promise<{ userId: string; workspaceId: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const workspaceId = await getWorkspaceForCurrentUser();
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  if (member?.role !== "owner") redirect(fallback);
  return { userId, workspaceId };
}
