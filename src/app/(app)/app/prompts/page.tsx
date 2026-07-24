import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireUser } from "@/lib/access";
import { listGenerations, getMonthlyUsage } from "@/lib/actions/prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptHistory } from "@/components/prompts/prompt-history";
import { AutoFeedsStudio } from "@/components/prompts/auto-feeds-studio";
import { BarChart3, DollarSign, History, Zap } from "lucide-react";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function PromptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const _user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();

  const [generations, usage] = await Promise.all([
    listGenerations(workspaceId),
    getMonthlyUsage(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Prompt Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Studio prompt visual untuk banner, feed, carousel, thumbnail, copy, dan storyboard.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
          <div className="rounded-xl border bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              Tokens
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {usage.totalInputTokens.toLocaleString()}
              <span className="font-normal text-muted-foreground"> / </span>
              {usage.totalOutputTokens.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              Cost
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              ${usage.totalCost.toFixed(4)}
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                / ${usage.monthlyCap}
              </span>
            </p>
          </div>
          <div className="rounded-xl border bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-purple-600" />
              Gen
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {generations.length}
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                bln ini
              </span>
            </p>
          </div>
        </div>
      </div>

      <AutoFeedsStudio />

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-slate-50/60 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <PromptHistory generations={generations} />
        </CardContent>
      </Card>
    </div>
  );
}
