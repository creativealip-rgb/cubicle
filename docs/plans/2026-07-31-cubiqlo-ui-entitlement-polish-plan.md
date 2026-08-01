# Cubiqlo UI + Plan Enforcement Polish Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make Cubiqlo package limits match product definition and enforce them at server boundaries.

**Architecture:** Centralize effective plan resolution in `src/lib/plan.ts`, including realtime expiry handling. Add small reusable gates for API rate, client portal entitlement, AI entitlement, and member limit. Wire gates into existing server actions/API routes, then align marketing/billing UI copy.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle/Postgres, Vitest, Redis distributed rate limiter.

---

## Source-of-truth package limits

| Limit | Free | Solo | Team |
|---|---:|---:|---:|
| Workspace | 1 | 3 | Unlimited |
| Members | 1 | 1 | Unlimited |
| Invite member | No | No | Yes |
| Client portal | No | Yes | Yes |
| AI | No | Yes | Yes |
| AI requests/day | 0 | 15 | 500 |
| API requests/min | 30 | 120 | Unlimited |
| Clients | 3 | Unlimited | Unlimited |
| Projects | 5 | Unlimited | Unlimited |
| Invoices/month | 10 | Unlimited | Unlimited |
| Max file | 5 MB | 25 MB | 50 MB |
| Workspace storage | 100 MB | 5 GB | 25 GB |
| Workspace files | 100 | 5,000 | 25,000 |
| Storage/client | unavailable | 1 GB | 5 GB |
| Files/client | unavailable | 1,000 | 5,000 |

## Current verified gaps

- `src/lib/plan.ts` defines `apiRequestsPerMinute`, but no caller uses `checkWorkspaceRateLimit(workspaceId, "api", plan)`.
- Free users can create clients with `portalEnabled: true` through `src/lib/actions/clients.ts`.
- Team UI says 5 users in `src/app/page.tsx`, backend says `maxMembers: 0` unlimited. Product source says Team unlimited, so UI must change, not backend.
- `maxMembers` is not enforced, but current target has Team unlimited and Free/Solo cannot invite. Keep helper for future finite limits, but no Team cap.
- `/api/ai/action` lacks `hasAiAssistant` and daily quota gate.
- `/api/ai/conversations` and `/api/ai/conversations/export` lack AI entitlement and abuse rate limit.
- `getUserPlan()` ignores `planExpiresAt`; expired paid plan remains active until `/api/cron/expire-plans` runs.
- Billing/landing copy omits many limits.

## Guardrails

- Preserve unrelated dirty files:
  - `src/components/sidebar/sidebar-navigation-wiring.test.ts`
  - `src/components/sidebar/sidebar-navigation.tsx`
  - `cubiqlo-dummy-client-manual.txt`
- Do not deploy production in this plan.
- No migration required unless storage quota columns are missing. This plan wires existing product limits first.
- Team member limit follows user source-of-truth: **Unlimited**, not 5.

---

### Task 1: Add realtime effective-plan helpers

**Objective:** `getUserPlan()` returns `free` when paid plan expired outside the 3-day grace window, independent from cron timing.

**Files:**
- Modify: `src/lib/plan.ts`
- Test: `src/lib/plan-entitlements.test.ts`

**Step 1: Write tests**

Create `src/lib/plan-entitlements.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getEffectivePlan, getPlanLimits } from "./plan";

describe("plan entitlements", () => {
  it("keeps active paid plan before expiry", () => {
    expect(getEffectivePlan("solo", new Date("2027-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"))).toBe("solo");
  });

  it("keeps paid plan during 3 day grace", () => {
    expect(getEffectivePlan("solo", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-03T23:59:59Z"))).toBe("solo");
  });

  it("downgrades paid plan after grace", () => {
    expect(getEffectivePlan("team", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-05T00:00:00Z"))).toBe("free");
  });

  it("keeps free as free", () => {
    expect(getEffectivePlan("free", null, new Date("2026-01-01T00:00:00Z"))).toBe("free");
  });

  it("matches source-of-truth limits", () => {
    expect(getPlanLimits("free")).toMatchObject({
      maxWorkspaces: 1,
      maxMembers: 1,
      canInviteMembers: false,
      hasClientPortal: false,
      hasAiAssistant: false,
      aiRequestsPerDay: 0,
      apiRequestsPerMinute: 30,
      maxClients: 3,
      maxProjects: 5,
      maxInvoicesPerMonth: 10,
      maxFileSizeMb: 5,
    });
    expect(getPlanLimits("solo")).toMatchObject({
      maxWorkspaces: 3,
      maxMembers: 1,
      canInviteMembers: false,
      hasClientPortal: true,
      hasAiAssistant: true,
      aiRequestsPerDay: 15,
      apiRequestsPerMinute: 120,
      maxFileSizeMb: 25,
    });
    expect(getPlanLimits("team")).toMatchObject({
      maxWorkspaces: 0,
      maxMembers: 0,
      canInviteMembers: true,
      hasClientPortal: true,
      hasAiAssistant: true,
      aiRequestsPerDay: 500,
      apiRequestsPerMinute: 0,
      maxFileSizeMb: 50,
    });
  });
});
```

**Step 2: Run failing test**

Run:

```bash
npm test -- src/lib/plan-entitlements.test.ts
```

Expected: fail because `getEffectivePlan` does not exist.

**Step 3: Implement helper**

Patch `src/lib/plan.ts`:

```ts
const PLAN_GRACE_DAYS = 3;

export function getEffectivePlan(
  plan: string | null | undefined,
  planExpiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): PlanTier {
  const tier = ((plan as PlanTier) in PLAN_LIMITS ? plan : "free") as PlanTier;
  if (tier === "free") return "free";
  if (!planExpiresAt) return tier;

  const expires = planExpiresAt instanceof Date ? planExpiresAt : new Date(planExpiresAt);
  if (Number.isNaN(expires.getTime())) return "free";

  const graceUntil = new Date(expires.getTime() + PLAN_GRACE_DAYS * 24 * 60 * 60 * 1000);
  return now <= graceUntil ? tier : "free";
}
```

Update `getUserPlan()` select:

```ts
.select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
```

Return:

```ts
return getEffectivePlan(user?.plan, user?.planExpiresAt);
```

Update `canCreateWorkspace()` and `canInviteMember()` to select `planExpiresAt` and call `getEffectivePlan()`.

**Step 4: Verify**

Run:

```bash
npm test -- src/lib/plan-entitlements.test.ts
```

Expected: pass.

---

### Task 2: Add reusable AI entitlement gate

**Objective:** Shared AI gate blocks Free users and applies daily quota when endpoint consumes AI feature.

**Files:**
- Modify: `src/lib/plan.ts`
- Test: `src/lib/plan-entitlements.test.ts`

**Step 1: Add tests**

Append:

```ts
import { describe, expect, it, vi } from "vitest";

// If mock-heavy DB tests become too brittle, test pure response helper only and cover wiring in Task 5.
```

Prefer adding a pure helper:

```ts
export function getAiEntitlementFailure(plan: string): { status: number; error: string } | null
```

Test:

```ts
it("returns AI entitlement failure for Free", () => {
  expect(getAiEntitlementFailure("free")).toEqual({
    status: 403,
    error: "AI Assistant tersedia di paket Solo dan Team.",
  });
});

it("allows AI entitlement for Solo and Team", () => {
  expect(getAiEntitlementFailure("solo")).toBeNull();
  expect(getAiEntitlementFailure("team")).toBeNull();
});
```

**Step 2: Implement pure helper**

In `src/lib/plan.ts`:

```ts
export function getAiEntitlementFailure(plan: string): { status: number; error: string } | null {
  const limits = getPlanLimits(plan);
  if (!limits.hasAiAssistant) {
    return { status: 403, error: "AI Assistant tersedia di paket Solo dan Team." };
  }
  return null;
}
```

**Step 3: Verify**

Run:

```bash
npm test -- src/lib/plan-entitlements.test.ts
```

Expected: pass.

---

### Task 3: Enforce client portal entitlement in server actions

**Objective:** Free users cannot create or enable client portal even by direct server-action call.

**Files:**
- Modify: `src/lib/actions/clients.ts`
- Test: `src/lib/client-portal-entitlement-wiring.test.ts`

**Step 1: Write wiring test**

Create `src/lib/client-portal-entitlement-wiring.test.ts` using source scan style:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/actions/clients.ts", "utf8");

describe("client portal entitlement wiring", () => {
  it("checks plan before enabling portal during client create", () => {
    expect(source).toContain("hasClientPortal");
    expect(source).toContain("portalEnabled");
    expect(source).toContain("Client portal tersedia di paket Solo dan Team");
  });

  it("checks plan before portal token/password enable actions", () => {
    expect(source).toContain("assertCanUseClientPortal");
    expect(source).toMatch(/generatePortalToken[\s\S]*assertCanUseClientPortal/);
    expect(source).toMatch(/setClientPortalPassword[\s\S]*assertCanUseClientPortal/);
  });
});
```

**Step 2: Implement gate**

In `src/lib/actions/clients.ts`, add helper after `assertCanCreateClient()`:

```ts
async function assertCanUseClientPortal(userId: string) {
  const { getUserPlan, getPlanLimits } = await import("@/lib/plan");
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);
  if (!limits.hasClientPortal) {
    throw new Error("Client portal tersedia di paket Solo dan Team.");
  }
}
```

In `insertClient()`, add `userId` already available. Before generating token:

```ts
if (parsed.portalEnabled) {
  await assertCanUseClientPortal(userId);
  ...
}
```

In `generatePortalToken()` and `setClientPortalPassword()`, after workspace/client assertions, add:

```ts
await assertCanUseClientPortal(user.id);
```

In `updateClient()`, if future UI allows portal toggles, reject when portal fields become enabled:

```ts
if (parsed.portalEnabled || parsed.portalSlugEnabled) {
  await assertCanUseClientPortal(user.id);
}
```

**Step 3: Verify**

Run:

```bash
npm test -- src/lib/client-portal-entitlement-wiring.test.ts
npm test -- src/lib/portal-token-persistence.test.ts src/lib/client-portal-password-wiring.test.ts
```

Expected: pass.

---

### Task 4: Add member-limit enforcement helper without changing Team unlimited

**Objective:** Future finite `maxMembers` values are enforced, while current Team unlimited remains valid.

**Files:**
- Modify: `src/lib/plan.ts`
- Modify: `src/lib/actions/team.ts`
- Modify: `src/lib/actions/workspace-members.ts`
- Test: `src/lib/team-member-limit-wiring.test.ts`

**Step 1: Add helper in `src/lib/plan.ts`**

```ts
export async function canAddWorkspaceMember(
  userId: string,
  workspaceId: string,
): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
  const [user] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const plan = getEffectivePlan(user?.plan, user?.planExpiresAt);
  const limits = getPlanLimits(plan);

  if (!limits.canInviteMembers) {
    return {
      allowed: false,
      reason: plan === "free"
        ? "Free plan tidak bisa mengundang anggota. Upgrade ke Team untuk kolaborasi."
        : "Upgrade ke Team untuk mengundang anggota.",
    };
  }

  if (limits.maxMembers > 0) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    if (count >= limits.maxMembers) {
      return { allowed: false, reason: `Plan ${plan.toUpperCase()} maksimal ${limits.maxMembers} anggota.`, current: count, limit: limits.maxMembers };
    }
  }

  return { allowed: true };
}
```

**Step 2: Wire action call sites**

In `src/lib/actions/team.ts`, replace:

```ts
const inviteCheck = await canInviteMember(user.id);
```

with:

```ts
const inviteCheck = await canAddWorkspaceMember(user.id, workspaceId);
```

Update import.

In `src/lib/actions/workspace-members.ts`, same replacement.

**Step 3: Add wiring test**

Create `src/lib/team-member-limit-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const plan = readFileSync("src/lib/plan.ts", "utf8");
const team = readFileSync("src/lib/actions/team.ts", "utf8");
const members = readFileSync("src/lib/actions/workspace-members.ts", "utf8");

describe("workspace member limit wiring", () => {
  it("has reusable member count gate", () => {
    expect(plan).toContain("canAddWorkspaceMember");
    expect(plan).toContain("maxMembers > 0");
    expect(plan).toContain("workspaceMembers.workspaceId");
  });

  it("invite paths use member count gate", () => {
    expect(team).toContain("canAddWorkspaceMember");
    expect(members).toContain("canAddWorkspaceMember");
  });
});
```

**Step 4: Verify**

Run:

```bash
npm test -- src/lib/team-member-limit-wiring.test.ts src/lib/plan-entitlements.test.ts
```

Expected: pass.

---

### Task 5: Enforce AI action/conversation entitlement and limits

**Objective:** AI action/conversation endpoints respect `hasAiAssistant`, daily quota where AI action consumes AI capability, and Redis abuse limits.

**Files:**
- Modify: `src/app/api/ai/action/route.ts`
- Modify: `src/app/api/ai/conversations/route.ts`
- Modify: `src/app/api/ai/conversations/export/route.ts`
- Test: `src/lib/ai/security-wiring.test.ts`

**Step 1: Extend wiring tests**

Patch `src/lib/ai/security-wiring.test.ts` or create `src/lib/ai-entitlement-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const action = readFileSync("src/app/api/ai/action/route.ts", "utf8");
const conv = readFileSync("src/app/api/ai/conversations/route.ts", "utf8");
const exp = readFileSync("src/app/api/ai/conversations/export/route.ts", "utf8");

describe("AI entitlement wiring", () => {
  it("AI action checks plan entitlement and daily quota", () => {
    expect(action).toContain("getAiEntitlementFailure");
    expect(action).toContain("checkAiRateLimitDb");
    expect(action).toContain("ai:action");
  });

  it("conversation endpoints check entitlement and Redis rate limit", () => {
    expect(conv).toContain("getAiEntitlementFailure");
    expect(conv).toContain("enforceRateLimitResponse");
    expect(exp).toContain("getAiEntitlementFailure");
    expect(exp).toContain("enforceRateLimitResponse");
  });
});
```

**Step 2: Patch `/api/ai/action`**

After session + Redis rate limit, add plan gate before parsing/executing action:

```ts
const { getUserPlan, getAiEntitlementFailure, checkAiRateLimitDb } = await import("@/lib/plan");
const plan = await getUserPlan(session.user.id);
const entitlementFailure = getAiEntitlementFailure(plan);
if (entitlementFailure) {
  return NextResponse.json({ error: entitlementFailure.error }, { status: entitlementFailure.status });
}
```

For actions that consume AI quota, after resolving `workspaceId` from task/invoice and before mutation/activity write:

```ts
const aiRate = await checkAiRateLimitDb(workspaceId, plan);
if (!aiRate.allowed) {
  return NextResponse.json(
    { error: `Batas AI harian tercapai (${aiRate.limit}/hari). Reset ${new Date(aiRate.resetAt).toISOString()}.` },
    { status: 429 },
  );
}
```

Use `task.workspaceId` and `invoice.workspaceId` respectively.

**Step 3: Patch conversations route**

In `src/app/api/ai/conversations/route.ts`, import:

```ts
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";
import { getAiEntitlementFailure, getUserPlan } from "@/lib/plan";
```

After session and workspace resolution in GET/POST/DELETE:

```ts
const limited = await enforceRateLimitResponse(req, "ai:conversations", { limit: 60, windowSec: 60 }, { identity: session.user.id });
if (limited) return limited;
const plan = await getUserPlan(session.user.id);
const entitlementFailure = getAiEntitlementFailure(plan);
if (entitlementFailure) {
  return NextResponse.json({ error: entitlementFailure.error }, { status: entitlementFailure.status });
}
```

DELETE can be allowed without entitlement if product wants users to delete old data after downgrade. If chosen, document exception in code comment and still apply Redis rate limit. Default plan: entitlement required for all AI conversation endpoints because audit listed all as gap.

**Step 4: Patch export route**

Same as conversations GET:

```ts
const limited = await enforceRateLimitResponse(req, "ai:conversations:export", { limit: 20, windowSec: 60 }, { identity: session.user.id });
if (limited) return limited;
const plan = await getUserPlan(session.user.id);
const entitlementFailure = getAiEntitlementFailure(plan);
if (entitlementFailure) return NextResponse.json({ error: entitlementFailure.error }, { status: entitlementFailure.status });
```

**Step 5: Verify**

Run:

```bash
npm test -- src/lib/ai-entitlement-wiring.test.ts src/lib/ai/security-wiring.test.ts
```

Expected: pass.

---

### Task 6: Add per-plan API rate limit helper and apply to authenticated API routes

**Objective:** `apiRequestsPerMinute` is enforced via Redis for authenticated workspace API routes.

**Files:**
- Create: `src/lib/plan-api-rate-limit.ts`
- Modify: selected `src/app/api/**/route.ts` authenticated workspace routes
- Test: `src/lib/plan-api-rate-limit-wiring.test.ts`

**Step 1: Create helper**

Create `src/lib/plan-api-rate-limit.ts`:

```ts
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
```

**Step 2: Identify routes**

Run:

```bash
find src/app/api -name route.ts -print | sort
```

Classify:

- Exclude public/security routes that already have endpoint-specific limits:
  - auth
  - webhooks
  - public portal password/order/request
  - proposal/contract public actions
  - invoice PDF/file download if already endpoint hardcoded
- Include authenticated app API routes with workspace/user context.

**Step 3: Wire helper**

For each included route after auth + workspace resolution:

```ts
const apiLimited = await enforcePlanApiRateLimit(req, { userId: session.user.id, workspaceId });
if (apiLimited) return apiLimited;
```

Minimum first pass should include `/api/ai/*` routes plus any user-facing app API routes found in audit. If many routes exist, do this in batches and run tests per batch.

**Step 4: Add wiring test**

Create `src/lib/plan-api-rate-limit-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const helper = readFileSync("src/lib/plan-api-rate-limit.ts", "utf8");

describe("plan API rate limit", () => {
  it("uses per-plan apiRequestsPerMinute through Redis", () => {
    expect(helper).toContain("apiRequestsPerMinute");
    expect(helper).toContain("enforceRateLimit");
    expect(helper).toContain("plan:api");
    expect(helper).toContain("workspaceId");
    expect(helper).toContain("userId");
  });
});
```

Add route-specific assertions for each wired route.

**Step 5: Verify**

Run:

```bash
npm test -- src/lib/plan-api-rate-limit-wiring.test.ts src/lib/distributed-rate-limit.test.ts
```

Expected: pass.

---

### Task 7: Align marketing/billing UI copy with source-of-truth limits

**Objective:** Users see same package limits that backend enforces.

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/(app)/app/billing/page.tsx`
- Test: `src/lib/billing-plan-copy-wiring.test.ts`

**Step 1: Add copy test**

Create `src/lib/billing-plan-copy-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const landing = readFileSync("src/app/page.tsx", "utf8");
const billing = readFileSync("src/app/(app)/app/billing/page.tsx", "utf8");

describe("billing copy package limits", () => {
  it("does not show Team as 5 users", () => {
    expect(landing).not.toContain("5 users");
    expect(billing).not.toContain("5 pengguna");
  });

  it("mentions key Free/Solo/Team limits", () => {
    for (const text of ["3 klien", "5 proyek", "10 invoice", "15 AI", "500 AI", "Unlimited users", "25 MB", "50 MB"]) {
      expect(`${landing}\n${billing}`).toContain(text);
    }
  });
});
```

Adjust exact language after reading current page copy.

**Step 2: Patch landing pricing items**

In `src/app/page.tsx`, update Team item:

```ts
"Unlimited users"
```

Add missing plan details in pricing arrays:

Free:
- `1 workspace`
- `3 clients`
- `5 projects`
- `10 invoices/month`
- `No client portal or AI`
- `5 MB/file`

Solo:
- `3 workspaces`
- `Unlimited clients/projects/invoices`
- `Client portal + AI`
- `15 AI requests/day`
- `25 MB/file`

Team:
- `Unlimited users/workspaces`
- `Unlimited clients/projects/invoices`
- `500 AI requests/day`
- `50 MB/file`

**Step 3: Patch billing page**

Update package cards/details to include same limits, localized to existing `t()` pattern.

**Step 4: Verify**

Run:

```bash
npm test -- src/lib/billing-plan-copy-wiring.test.ts
```

Expected: pass.

---

### Task 8: Remove duplicate invoice header tabs and normalize invoice links

**Objective:** Invoice page has only one filtering tab surface: the lower `StatusFilterTabs` filter row. Remove any legacy three-tab header (`Semua Invoice`, `Belum Ditagihkan`, `Sudah Ditagihkan`) and fix links that point to that removed tab contract.

**Audit evidence:**
- Screenshot shows legacy header tabs below Invoice title.
- Current source has canonical lower filter row in `src/app/(app)/app/invoices/page.tsx:457-474` using `StatusFilterTabs`.
- Current source uses `status` query param for invoice filters in `buildInvoicesHref()`.
- Search found current invoice links:
  - `/app/invoices?status=overdue` in dashboard/reports: valid, keep.
  - `/app/invoices?from=...&to=...` in reports: current page does not parse `from`/`to`, normalize or remove because it points to unsupported filters.
  - no current source hit for `Semua Invoice` / `Belum Ditagihkan` / `Sudah Ditagihkan`; verify generated/live code after implementation if screenshot still shows it.
- Screenshot/table audit found duplicate top dropdown filters for `Klien` and `Jenis proyek` above invoice table. User wants those moved into table header filters like Tasks/Projects pattern, specifically on columns `Klien`, `Proyek`, and `Jenis`.

**Files:**
- Modify: `src/app/(app)/app/invoices/page.tsx`
- Modify: `src/components/invoices/invoices-list-table.tsx`
- Modify: `src/app/(app)/app/reports/page.tsx`
- Test: `src/lib/invoice-page-actions-wiring.test.ts` or create `src/lib/invoice-page-tabs-wiring.test.ts`

**Step 1: Write source-scan test**

Create `src/lib/invoice-page-tabs-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const invoicePage = readFileSync("src/app/(app)/app/invoices/page.tsx", "utf8");
const reportsPage = readFileSync("src/app/(app)/app/reports/page.tsx", "utf8");

describe("invoice page tab cleanup", () => {
  it("does not render legacy three header tabs", () => {
    expect(invoicePage).not.toContain("Semua Invoice");
    expect(invoicePage).not.toContain("Belum Ditagihkan");
    expect(invoicePage).not.toContain("Sudah Ditagihkan");
    expect(invoicePage).not.toContain("tab=unbilled");
    expect(invoicePage).not.toContain("tab=billed");
  });

  it("keeps one canonical status filter surface", () => {
    const matches = invoicePage.match(/<StatusFilterTabs/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(invoicePage).toContain("activeValue={statusTab}");
    expect(invoicePage).toContain("params.set(\"status\", filters.status)");
  });

  it("does not link to unsupported invoice date query params", () => {
    expect(reportsPage).not.toContain("/app/invoices?from=");
    expect(reportsPage).not.toContain("&to=");
  });

  it("removes top client/type filter form from invoice page", () => {
    expect(invoicePage).not.toContain("id=\"invoice-filter-client\"");
    expect(invoicePage).not.toContain("id=\"invoice-filter-billing\"");
    expect(invoicePage).not.toContain("name=\"clientId\"");
    expect(invoicePage).not.toContain("name=\"billing\"");
  });
});
```

Create `src/lib/invoice-table-header-filters-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const table = readFileSync("src/components/invoices/invoices-list-table.tsx", "utf8");
const page = readFileSync("src/app/(app)/app/invoices/page.tsx", "utf8");

describe("invoice table header filters", () => {
  it("passes client/project/type filter metadata into invoice table", () => {
    expect(page).toContain("clientOptions={clientOptions}");
    expect(page).toContain("projectOptions={projectOptions}");
    expect(page).toContain("currentFilters={{");
  });

  it("renders header filters for client, project, and type columns", () => {
    expect(table).toContain("InvoiceTableHeaderFilter");
    expect(table).toContain("filterKey=\"clientId\"");
    expect(table).toContain("filterKey=\"projectId\"");
    expect(table).toContain("filterKey=\"billing\"");
  });

  it("keeps sortable headers on filtered columns", () => {
    expect(table).toMatch(/label=\{t\(\"Klien\", \"Client\"\)\}[\s\S]*filterKey=\"clientId\"/);
    expect(table).toMatch(/label=\{t\(\"Proyek\", \"Project\"\)\}[\s\S]*filterKey=\"projectId\"/);
    expect(table).toMatch(/label=\{t\(\"Jenis\", \"Type\"\)\}[\s\S]*filterKey=\"billing\"/);
  });
});
```

**Step 2: Run failing tests**

Run:

```bash
npm test -- src/lib/invoice-page-tabs-wiring.test.ts src/lib/invoice-table-header-filters-wiring.test.ts
```

Expected: fail while unsupported report link/top filters/header filters still need code changes, or pass only if source already cleaned and screenshot is stale/live-build issue.

**Step 3: Remove legacy header tabs if present**

In `src/app/(app)/app/invoices/page.tsx`, remove any header-area tab block that renders labels:

```tsx
Semua Invoice
Belum Ditagihkan
Sudah Ditagihkan
```

Do not remove the lower canonical block:

```tsx
<StatusFilterTabs
  activeValue={statusTab}
  tabs={STATUS_TABS.map(...)}
/>
```

If no legacy block exists in source, document finding: screenshot likely from deployed/stale build or another branch. Then no-op this step.

**Step 4: Move client/project/type filters into table headers**

In `src/app/(app)/app/invoices/page.tsx`:

1. Add `projectId?: string;` to `searchParams` type and `InvoiceListFilters`.
2. Parse project filter:

```ts
const projectId = isUuid(params.projectId) ? params.projectId : undefined;
```

3. Include `projectId` in `buildInvoicesHref()`:

```ts
if (filters.projectId) params.set("projectId", filters.projectId);
```

4. Add project condition in `buildFilterConditions()`:

```ts
if (opts.projectId) {
  conditions.push(eq(invoices.projectId, opts.projectId));
}
```

5. Add `projectId` to count conditions and `filtersForHref`.
6. Query `projectOptions` scoped to workspace:

```ts
const projectOptions = await db
  .select({ id: projects.id, name: projects.name })
  .from(projects)
  .where(eq(projects.workspaceId, workspaceId))
  .orderBy(projects.name);
```

7. Remove top form block containing:

```tsx
id="invoice-filter-client"
id="invoice-filter-billing"
```

Keep `StatusFilterTabs`.

8. Pass filter metadata into table:

```tsx
<InvoicesListTable
  invoices={invoiceListWithBase}
  baseCurrency={baseCurrency}
  clientOptions={clientOptions.map((c) => ({ id: c.id, name: c.companyName || c.name }))}
  projectOptions={projectOptions}
  currentFilters={{ status: statusTab, clientId, projectId, billing }}
/>
```

In `src/components/invoices/invoices-list-table.tsx`:

1. Add props:

```ts
clientOptions?: Array<{ id: string; name: string }>;
projectOptions?: Array<{ id: string; name: string }>;
currentFilters?: {
  status?: string;
  clientId?: string;
  projectId?: string;
  billing?: string;
};
```

2. Add a small client-only header filter using `Select`, `useRouter`, `useSearchParams`, `useTransition`, same pattern as `TaskFilters`/`ProjectFilters`:

```tsx
function InvoiceTableHeaderFilter({ filterKey, value, options, placeholder }: { ... }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  function apply(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (!nextValue || nextValue === "all") params.delete(filterKey);
    else params.set(filterKey, nextValue);
    startTransition(() => router.push(`/app/invoices${params.toString() ? `?${params.toString()}` : ""}`));
  }
  return <Select value={value ?? "all"} onValueChange={apply}>...</Select>;
}
```

3. Compose sortable header + filter under these columns:

- `Klien`: `filterKey="clientId"`, options from clients, placeholder `Semua klien`.
- `Proyek`: `filterKey="projectId"`, options from projects, placeholder `Semua proyek`.
- `Jenis`: `filterKey="billing"`, options `hours/package/project/none`, labels from `billingTypeLabel()` and `Tanpa proyek`.

4. Do not add separate top filter controls. Filter lives in table header only.

5. Mobile view can keep no table-header filters because table hidden on mobile. If needed later, add compact mobile filter row separately; not in this task.

**Step 5: Fix links targeting removed/unsupported filters**

In `src/app/(app)/app/reports/page.tsx`, replace unsupported date-filter link:

```tsx
<Link href={`/app/invoices?from=${period.start}&to=${period.end}`}>
```

with canonical invoice page link:

```tsx
<Link href="/app/invoices">
```

Keep valid status links:

```tsx
<Link href="/app/invoices?status=overdue">
```

because `src/app/(app)/app/invoices/page.tsx` parses `status`.

If product still needs period-specific invoice drilldown later, add a separate future plan task to implement `from`/`to` parsing; do not leave dead query params now.

**Step 6: Verify**

Run:

```bash
npm test -- src/lib/invoice-page-tabs-wiring.test.ts src/lib/invoice-table-header-filters-wiring.test.ts src/lib/invoice-page-actions-wiring.test.ts
npx tsc --noEmit
```

Expected: tests and typecheck pass.

**Step 7: Browser verify**

Run app locally or use existing dev environment, then open `/app/invoices` authenticated. Verify:

- Header shows title + subtitle + `Invoice Baru` only.
- No `Semua Invoice` / `Belum Ditagihkan` / `Sudah Ditagihkan` header tabs.
- Lower filter row remains visible with status filters only.
- No separate top dropdown filter for client/type above table.
- Table headers `Klien`, `Proyek`, and `Jenis` each expose filter dropdowns.
- Changing header filters updates URL query (`clientId`, `projectId`, `billing`) and resets `page`.
- Dashboard/reports links land on valid invoice URLs.

---

### Task 9: Polish time page header actions and daily/weekly filter tabs

**Objective:** Time page action buttons (`Catat Waktu`, `Mulai Timer`, `Ekspor PDF`) sit on the same row as the `Waktu` page title, and the `Harian` / `Mingguan` filtering tab style is upgraded to the shared polished filter-tab look.

**Audit evidence:**
- Current time page action row is in `src/app/(app)/app/time/page.tsx:197-213`, but screenshot shows it visually lower/right from the title. Tighten header layout to align actions with title row.
- `Catat Waktu` comes from `ManualEntryForm` in `src/components/time/manual-entry-form.tsx`.
- `Ekspor PDF` comes from `PdfExportButton` in `src/components/time/pdf-export-button.tsx`.
- `Mulai Timer` currently exists inside `TimerWidget` body in `src/components/time/timer-widget.tsx:727-730`, not as a header CTA. Add header trigger or compact variant so start-timer action can be placed beside the title without duplicating timer logic.
- `Timesheet` currently has filter card in `src/components/time/timesheet.tsx:352-468`; no polished `Harian` / `Mingguan` tab source found in the current component search, so implementation must locate the live tab block if branch has it, or add/standardize it in `Timesheet`.

**Files:**
- Modify: `src/app/(app)/app/time/page.tsx`
- Modify: `src/components/time/timer-widget.tsx`
- Modify: `src/components/time/timesheet.tsx`
- Test: create `src/lib/time-page-layout-wiring.test.ts`

**Step 1: Write wiring test**

Create `src/lib/time-page-layout-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(app)/app/time/page.tsx", "utf8");
const timer = readFileSync("src/components/time/timer-widget.tsx", "utf8");
const timesheet = readFileSync("src/components/time/timesheet.tsx", "utf8");
const teamTimesheet = readFileSync("src/components/time/team-timesheet-view.tsx", "utf8");

describe("time page layout polish", () => {
  it("places manual entry, timer, and pdf actions in page header", () => {
    expect(page).toContain("ManualEntryForm");
    expect(page).toContain("TimerWidget");
    expect(page).toContain("PdfExportButton");
    expect(page).toContain("app-page-header");
    expect(page).toContain("time-header-actions");
  });

  it("supports compact/header timer action separate from full timer panel", () => {
    expect(timer).toContain("variant?:");
    expect(timer).toContain("header");
    expect(timer).toContain("Mulai Timer");
  });

  it("styles daily/weekly tabs with shared filter-tab look", () => {
    expect(teamTimesheet).toContain("Harian");
    expect(teamTimesheet).toContain("Mingguan");
    expect(teamTimesheet).toMatch(/rounded-(lg|xl|full)[\s\S]*bg-muted/);
  });

  it("styles weekly date selector like daily date pill", () => {
    expect(teamTimesheet).toContain("Minggu ini");
    expect(teamTimesheet).toContain("inline-flex items-center rounded-lg border bg-background");
    expect(teamTimesheet).toContain("border-x");
    expect(teamTimesheet).toContain("border-l");
  });
});
```

**Step 2: Run failing test**

Run:

```bash
npm test -- src/lib/time-page-layout-wiring.test.ts
```

Expected: fail until layout and tab styling are implemented.

**Step 3: Move page actions into title row**

In `src/app/(app)/app/time/page.tsx`, replace header wrapper with app header pattern:

```tsx
<div className="app-page-header">
  <div className="min-w-0">
    <h1 className="app-page-title">{t("Waktu", "Time")}</h1>
    <p className="text-sm text-muted-foreground">
      {t("Catat waktu dan isi timesheet mingguan.", "Log time and fill weekly timesheets.")}
    </p>
  </div>
  <div className="time-header-actions flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
    {canWrite && (
      <ManualEntryForm ... />
    )}
    {canWrite && (
      <TimerWidget variant="header" ... />
    )}
    <PdfExportButton clients={clientList} projects={projectList} />
  </div>
</div>
```

Keep full timer panel below only if active timer exists or if product still needs detail panel. Preferred minimal behavior:

```tsx
{canWrite && activeTimer ? <TimerWidget variant="panel" ... /> : null}
```

Avoid showing two `Mulai Timer` buttons at once.

**Step 4: Add TimerWidget compact/header variant**

In `src/components/time/timer-widget.tsx`:

1. Add prop:

```ts
variant?: "panel" | "header";
```

2. Default `variant = "panel"`.
3. If `variant === "header"` and no active timer, render only outline button:

```tsx
<Button variant="outline" size="sm" className="gap-2" onClick={...openStartTimerDialogOrStartEmptyFlow...}>
  <Play className="h-4 w-4" />
  {t("Mulai Timer", "Start Timer")}
</Button>
```

Implementation options:
- If existing widget start form state can be opened in a dialog, reuse same fields in dialog.
- If existing start flow requires full inline form, header button can scroll/focus panel; then keep a hidden/expanded panel below. But final UI must not show duplicate prominent start button.

4. If active timer exists, header variant can show active timer controls or link/scroll button, but avoid duplicating full active timer panel if present.

**Step 5: Style Harian/Mingguan filter tabs and weekly date pill consistently**

In `src/components/time/team-timesheet-view.tsx`, update mode tabs:

```tsx
<div className="inline-flex rounded-lg bg-muted p-1 text-sm text-muted-foreground">
  <button className={cn("rounded-md px-3 py-1.5 font-medium", mode === "today" ? "bg-background text-foreground shadow" : "hover:text-foreground")}>Harian</button>
  <button className={cn("rounded-md px-3 py-1.5 font-medium", mode === "week" ? "bg-background text-foreground shadow" : "hover:text-foreground")}>Mingguan</button>
</div>
```

Use same visual language as `StatusFilterTabs`: muted track, white active pill, clear focus ring.

Also update weekly navigation style to match daily date selector pill from screenshot. Current weekly block is `src/components/time/team-timesheet-view.tsx:85-92` with separate outline arrow buttons. Replace it with one pill container:

```tsx
<div className="inline-flex items-center rounded-lg border bg-background text-sm shadow-sm">
  <button type="button" className="px-3 py-2" aria-label={t("Minggu sebelumnya", "Previous week")} onClick={() => setWeekOffset((value) => value - 1)}>
    <ChevronLeft className="h-4 w-4" />
  </button>
  <span className="border-x px-3 py-2 font-medium">
    {week[0].date.toLocaleDateString(locale, { day: "numeric", month: "short" })} – {week[6].date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
  </span>
  <button type="button" className="px-3 py-2" aria-label={t("Minggu berikutnya", "Next week")} onClick={() => setWeekOffset((value) => value + 1)}>
    <ChevronRight className="h-4 w-4" />
  </button>
  <button type="button" className="border-l px-3 py-2 font-medium" onClick={() => setWeekOffset(0)}>
    {t("Minggu ini", "This week")}
  </button>
</div>
```

Keep weekly total (`duration(weekMinutes, h, m)`) adjacent/below as small summary, not embedded as separate mismatched control.

If daily selector lives in another component/branch, mirror its exact classes for weekly selector so both controls share border radius, border, dividers, text size, and reset-button placement.

**Step 6: Fix empty timer date filter to today**

**Objective:** Timer started from empty timer must appear under today's daily filter/date, not the stale selected date such as `30 Jul 2026`.

**Audit evidence:**
- Empty timer starts through `src/components/time/timer-widget.tsx:276-280` calling `startTimer({ workspaceId })`.
- Server action `src/lib/actions/time.ts:197-201` stores `startTime: new Date()`, so DB start date is correct.
- Bug is likely client-side day filter/date selector state not resetting to today after starting/stopping an empty timer, or active list using stale selected day while new entry belongs to today.
- `ManualEntryForm` resets manual date to `localDateValue()` after submit, but empty timer flow has no equivalent selected-day reset.

**Files:**
- Modify: `src/components/time/timer-widget.tsx`
- Modify: `src/components/time/team-timesheet-view.tsx` or whichever component owns the `30 Jul 2026` day selector in the active branch
- Modify: `src/components/time/timesheet.tsx` if it owns the daily filter date state
- Test: create `src/lib/time-empty-timer-today-filter-wiring.test.ts`

**Step 6.1: Add wiring test**

Create `src/lib/time-empty-timer-today-filter-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const timer = readFileSync("src/components/time/timer-widget.tsx", "utf8");
const teamTimesheet = readFileSync("src/components/time/team-timesheet-view.tsx", "utf8");
const timesheet = readFileSync("src/components/time/timesheet.tsx", "utf8");

describe("empty timer appears in today's filter", () => {
  it("empty timer flow emits or triggers today reset", () => {
    expect(timer).toContain("handleStartEmpty");
    expect(timer).toMatch(/onTimerStarted|reset.*Today|set.*Today|time-entry-started/i);
  });

  it("daily filter owner can reset selected date to today", () => {
    const source = `${teamTimesheet}\n${timesheet}`;
    expect(source).toMatch(/set.*Today|goToToday|selectedDate|dateOffset/i);
  });
});
```

**Step 6.2: Locate actual day selector owner**

Search current branch:

```bash
grep -R "Hari ini\|30 Jul\|selectedDate\|dateOffset" -n src/components/time src/app/(app)/app/time
```

Expected owner is `team-timesheet-view.tsx`, `timesheet.tsx`, or a dedicated date-filter component. Patch the real owner, not a guessed component.

**Step 6.3: Reset selected daily date after empty timer starts**

Preferred implementation:

- Add callback prop to `TimerWidget`:

```ts
onTimerStarted?: (entry: { startTime?: Date | string | null }) => void;
```

- Call it in both `handleStart` and `handleStartEmpty` after `setActiveTimer`:

```ts
onTimerStarted?.({ startTime: entry.startTime });
```

- In the time page/date-filter owner, implement:

```ts
function goToToday() {
  setSelectedDate(localDateValue());
  setDateOffset(0); // if offset-based
}
```

- Pass callback:

```tsx
<TimerWidget ... onTimerStarted={() => goToToday()} />
```

If component boundaries make callback awkward, dispatch a small browser event from timer and listen in date filter owner:

```ts
window.dispatchEvent(new CustomEvent("cubiqlo:time-entry-started", { detail: { startTime: entry.startTime } }));
```

Then listener resets selected date to today. Prefer prop callback when possible.

**Step 6.4: Verify behavior**

Run:

```bash
npm test -- src/lib/time-empty-timer-today-filter-wiring.test.ts
npx tsc --noEmit
```

Browser verify:

1. Navigate `/app/time`.
2. Select previous date such as `30 Jul 2026`.
3. Click `Mulai Timer` from empty timer.
4. Stop/save timer.
5. UI date filter returns to `Hari ini` and new timer appears in today's list.
6. Old selected date no longer captures new empty timer row.

**Step 7: Clean edit-entry dialog and time history display**

**Objective:** Edit time-entry dialog removes the `Aktivitas` field, renames `Tugas terkait` to `Tugas` / `Task`, and the time history row shows project + task as the main title with description underneath.

**Files:**
- Modify: `src/components/time/timesheet.tsx`
- Test: extend `src/lib/time-page-layout-wiring.test.ts` or create `src/lib/time-entry-dialog-history-wiring.test.ts`

**Step 7.1: Add wiring test**

Create `src/lib/time-entry-dialog-history-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/time/timesheet.tsx", "utf8");

describe("time entry edit dialog and history", () => {
  it("does not show activity select in edit dialog", () => {
    expect(source).not.toContain("Label className=\"text-xs\">{t(\"Activity\"");
    expect(source).not.toContain("editActivities.map");
  });

  it("renames related task label to task", () => {
    expect(source).toContain("{t(\"Tugas\", \"Task\")}");
    expect(source).not.toContain("Tugas terkait");
    expect(source).not.toContain("Related Task");
  });

  it("uses project and task as history primary title before description", () => {
    expect(source).toContain("historyPrimaryTitle");
    expect(source).toContain("historyDescription");
    expect(source).toMatch(/historyPrimaryTitle[\s\S]*entry\.projectName[\s\S]*entry\.taskTitle/);
  });
});
```

**Step 7.2: Remove edit dialog activity field**

In `src/components/time/timesheet.tsx`, remove the edit-dialog block:

```tsx
<div className="space-y-1.5">
  <Label className="text-xs">{t("Activity", "Activity")}</Label>
  <Select ...>
    ...editActivities.map...
  </Select>
</div>
```

Keep existing state if used elsewhere, but edit dialog should not render it. On save, continue passing existing `editActivityId` or set `activityId: editActivityId || null` as current logic does unless product decides to wipe it. Do not silently wipe old activity data in this UI-only cleanup.

**Step 7.3: Rename task label**

In edit dialog, change:

```tsx
<Label className="text-xs">{t("Tugas terkait", "Related Task")}</Label>
```

to:

```tsx
<Label className="text-xs">{t("Tugas", "Task")}</Label>
```

Optional: apply same label rename in `manual-entry-form.tsx`, `stop-timer-dialog.tsx`, and `timer-widget.tsx` in a later consistency task. For this request, edit dialog is required.

**Step 7.4: Change history row primary text**

In history list row (`pageEntries.map`), replace current primary line:

```tsx
<p className="text-sm font-medium truncate">
  {entry.description || t("Tanpa judul", "Untitled")}
</p>
```

with project/task based title:

```tsx
const historyPrimaryTitle = [entry.projectName, entry.taskTitle].filter(Boolean).join(" · ") || entry.projectName || entry.taskTitle || t("Tanpa proyek / task", "No project / task");
const historyDescription = entry.description?.trim();
```

Render:

```tsx
<p className="text-sm font-medium truncate">{historyPrimaryTitle}</p>
{historyDescription ? (
  <p className="mt-0.5 truncate text-xs text-muted-foreground">{historyDescription}</p>
) : null}
```

Then remove duplicate `projectName` / `taskTitle` from the metadata line below, leaving client, user, date, and optionally activity/tags.

**Step 7.5: Verify focused test**

Run:

```bash
npm test -- src/lib/time-entry-dialog-history-wiring.test.ts src/lib/time-page-layout-wiring.test.ts
```

Expected: pass.

**Step 8: Verify**

Run:

```bash
npm test -- src/lib/time-page-layout-wiring.test.ts src/lib/time-empty-timer-today-filter-wiring.test.ts src/lib/time-entry-dialog-history-wiring.test.ts
npx tsc --noEmit
```

Expected: pass.

**Step 9: Browser verify**

Open `/app/time` authenticated. Verify:

- Title row shows `Waktu` left.
- `Catat Waktu`, `Mulai Timer`, `Ekspor PDF` align with title row right on desktop.
- Mobile stacks actions below title without overflow.
- No duplicate prominent `Mulai Timer` button.
- `Harian` / `Mingguan` tabs use polished pill filter style.
- Edit time-entry dialog no longer shows `Aktivitas`.
- Edit time-entry dialog label says `Tugas` / `Task`, not `Tugas terkait`.
- Time history row primary title is project + task; description appears below.

---

### Task 10: Full verification

**Objective:** Prove changes are type-safe and do not break existing entitlement/rate/upload tests.

**Files:**
- No code unless failures require fixes.

**Step 1: Focused tests**

Run:

```bash
npm test -- \
  src/lib/plan-entitlements.test.ts \
  src/lib/client-portal-entitlement-wiring.test.ts \
  src/lib/team-member-limit-wiring.test.ts \
  src/lib/ai-entitlement-wiring.test.ts \
  src/lib/plan-api-rate-limit-wiring.test.ts \
  src/lib/billing-plan-copy-wiring.test.ts \
  src/lib/invoice-page-tabs-wiring.test.ts \
  src/lib/invoice-table-header-filters-wiring.test.ts \
  src/lib/time-page-layout-wiring.test.ts \
  src/lib/time-empty-timer-today-filter-wiring.test.ts \
  src/lib/time-entry-dialog-history-wiring.test.ts \
  src/lib/billing-plans.test.ts \
  src/lib/distributed-rate-limit.test.ts \
  src/lib/upload-safety.test.ts \
  src/lib/upload-safety-wiring.test.ts
```

Expected: all pass.

**Step 2: Full test suite**

Run:

```bash
npm test
```

Expected: pass. If unrelated dirty sidebar tests fail, identify whether failure existed before touching entitlement files.

**Step 3: Type/lint/build**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: pass or report pre-existing warnings separately.

**Step 4: Git review**

Run:

```bash
git diff -- src/lib/plan.ts src/lib/actions/clients.ts src/lib/actions/team.ts src/lib/actions/workspace-members.ts src/app/api/ai src/lib/plan-api-rate-limit.ts src/app/page.tsx 'src/app/(app)/app/billing/page.tsx' src/lib/*entitlement*.test.ts src/lib/*rate-limit*wiring.test.ts src/lib/billing-plan-copy-wiring.test.ts
git status --short
```

Expected: entitlement/rate plan files changed; unrelated sidebar/dummy files preserved and not staged unless user explicitly asks.

---

## Definition of Done

- `getUserPlan()` respects `planExpiresAt` + 3-day grace in realtime.
- Free cannot enable client portal through create/generate/password actions.
- AI chat/action/conversation/export reject Free users server-side.
- AI action consumes daily quota for Solo/Team.
- Per-plan API request/minute has Redis-backed helper and is wired into authenticated workspace API routes.
- Team shown as unlimited users to match backend/source-of-truth.
- Billing/landing copy lists key plan limits.
- Focused tests, full tests, typecheck, lint, and build run with real output.
