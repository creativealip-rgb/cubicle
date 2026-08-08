import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { listGenerations, getMonthlyUsage } from "@/lib/actions/prompts";
import { PromptStudio } from "@/components/prompts/prompt-studio";
import { getPlanLimits, getUserPlan } from "@/lib/plan";

export default async function PromptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const [generations, usage] = await Promise.all([
    listGenerations(workspaceId),
    getMonthlyUsage(workspaceId),
  ]);

  const plan = await getUserPlan(user.id);
  const limits = getPlanLimits(plan);
  const generationLimit = limits.aiRequestsPerMonth;
  return <PromptStudio generations={generations} usage={{ ...usage, generationLimit }} />;
}
