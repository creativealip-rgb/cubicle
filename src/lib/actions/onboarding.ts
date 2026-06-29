"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

const onboardingSchema = z.object({
  workspaceName: z.string().trim().min(2, "Workspace name is required").max(80),
});

export async function finishOnboarding(input: z.infer<typeof onboardingSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = onboardingSchema.parse(input);

  const [workspace] = await db
    .update(workspaces)
    .set({
      name: parsed.workspaceName,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "completed_onboarding", "workspace", workspaceId, {
    workspaceName: parsed.workspaceName,
  });

  return { success: true, workspace };
}
