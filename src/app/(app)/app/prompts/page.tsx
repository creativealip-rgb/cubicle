import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { listGenerations, getMonthlyUsage } from "@/lib/actions/prompts";
import { PromptStudio } from "@/components/prompts/prompt-studio";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function PromptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const [generations, usage] = await Promise.all([
    listGenerations(workspaceId),
    getMonthlyUsage(workspaceId),
  ]);

  const [account] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, user.id)).limit(1);
  const generationLimit = account?.plan === "team" ? null : account?.plan === "solo" ? 100 : 10;
  return <PromptStudio generations={generations} usage={{ ...usage, generationLimit }} />;
}
