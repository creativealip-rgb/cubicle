import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";
import { getPlanLimits, getUserPlan } from "@/lib/plan";

export async function enforcePlanApiRateLimit(
  request: Request,
  input: { userId: string; workspaceId: string },
): Promise<Response | null> {
  const plan = await getUserPlan(input.userId);
  const limit = getPlanLimits(plan).apiRequestsPerMinute;
  if (limit === 0) return null;

  const result = await enforceRateLimit(
    request,
    "plan:api",
    { limit, windowSec: 60 },
    { identity: `${input.workspaceId}:${input.userId}` },
  );

  if (result.allowed) return null;

  return NextResponse.json(
    { error: "API request limit reached", limit, retryAfterSec: result.retryAfterSec },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}
