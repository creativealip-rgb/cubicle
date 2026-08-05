import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { listGenerations, getMonthlyUsage } from "@/lib/actions/prompts";
import { PromptStudio } from "@/components/prompts/prompt-studio";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

import { getPlanLimits } from "@/lib/plan";

export default async function PromptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const [generations, usage] = await Promise.all([
    listGenerations(workspaceId),
    getMonthlyUsage(workspaceId),
  ]);

  const [account] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, user.id)).limit(1);
  const limits = getPlanLimits(account?.plan ?? "free");
  const generationLimit = limits.aiRequestsPerMonth;
  return <PromptStudio generations={generations} usage={{ ...usage, generationLimit }} />;
}
