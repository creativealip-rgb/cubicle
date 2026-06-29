import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { promptTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { listGenerations, getMonthlyUsage } from "@/lib/actions/prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptForm } from "@/components/prompts/prompt-form";
import { PromptHistory } from "@/components/prompts/prompt-history";
import { Sparkles, BarChart3, DollarSign, Zap } from "lucide-react";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function PromptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const _user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();

  const [templates, generations, usage] = await Promise.all([
    db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.workspaceId, workspaceId))
      .orderBy(promptTemplates.category, promptTemplates.name),
    listGenerations(workspaceId),
    getMonthlyUsage(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prompt Generator</h1>
        <p className="text-sm text-muted-foreground">
          Generate content, proposals, and insights using AI
        </p>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tokens (In/Out)</p>
                <p className="text-lg font-bold">
                  {usage.totalInputTokens.toLocaleString()} / {usage.totalOutputTokens.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Cost</p>
                <p className="text-lg font-bold">
                  ${usage.totalCost.toFixed(4)}
                  <span className="text-xs text-muted-foreground font-normal">
                    {" "}/ ${usage.monthlyCap} cap
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Generations</p>
                <p className="text-lg font-bold">{generations.length} this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Generator form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4" />
              Generate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PromptForm templates={templates} workspaceId={workspaceId} />
          </CardContent>
        </Card>

        {/* History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              <BarChart3 className="mr-2 inline h-4 w-4" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PromptHistory generations={generations} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
