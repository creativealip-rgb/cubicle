import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { listGenerations, getMonthlyUsage } from "@/lib/actions/prompts";
import { PromptStudio } from "@/components/prompts/prompt-studio";

export default async function PromptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const [generations, usage] = await Promise.all([
    listGenerations(workspaceId),
    getMonthlyUsage(workspaceId),
  ]);

  return <PromptStudio generations={generations} usage={usage} />;
}
