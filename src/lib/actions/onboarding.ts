"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { createWorkspaceForUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

const onboardingSchema = z.object({
  workspaceName: z.string().trim().min(2, "Workspace name is required").max(80),
});

export async function finishOnboarding(input: z.infer<typeof onboardingSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const parsed = onboardingSchema.parse(input);
  const workspace = await createWorkspaceForUser(user.id, parsed.workspaceName);
  const workspaceId = workspace.id;

  await writeActivityLog(workspaceId, user.id, "completed_onboarding", "workspace", workspaceId, {
    workspaceName: parsed.workspaceName,
  });

  return { success: true, workspace };
}
