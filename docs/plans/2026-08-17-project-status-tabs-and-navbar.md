# Project Status Tabs + Navbar "New" Fix — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix the visually-inconsistent global "New" button on the Projects page, and replace the Projects list status dropdown with 3 clean status filter tabs (Active / On Hold / Complete).

**Architecture:** Reuse the existing `StatusFilterTabs` pill component (same pattern as Proposals/Contracts/Invoices). Hide the global "New" button on `/app/projects` since that page already has its own `+ New Project` CTA. Add read-time status mapping so legacy statuses (`draft`, `review`) still appear under the Active tab — no data migration.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Postgres, React 19, Vitest, bilingual i18n via `t(id, en)`.

---

## Root Cause Analysis

### A. Navbar "New" button
File: `src/components/app-topbar.tsx` lines 283-312.

The global "New" dropdown button renders as a bare purple `+` square on the Projects page because of:
```tsx
<span className={cn("hidden sm:inline", pathname === "/app/projects" && "lg:hidden")}>
  {t("Baru", "New")}
</span>
```
On `/app/projects` at `lg+` width, the label is hidden → only the `+` icon shows → looks like an orphaned square. Its dropdown contains Client/Proposal/Questionnaire/Invoice (no "Project"), so it's also redundant with the page's own `+ New Project` button.

**Fix (Option 1 — clean):** Do not render the global "New" button when `pathname === "/app/projects"`. The page header already provides `+ New Project`.

### B. Project status filtering
Files:
- `src/lib/project-list-filters.ts` — `PROJECT_STATUS_TABS` has 6 values.
- `src/app/(app)/app/projects/page.tsx` — `parseStatusTab` defaults to `"active"`, filters via `eq(projects.status, statusTab)`.
- `src/components/projects/projects-list-table.tsx` — status filter is a `TableHeaderFilter` dropdown in the table header (queryKey `status`).

The user wants 3 tabs instead: **active / on_hold / completed**. This matches the existing edit schema `projectListStatusSchema = z.enum(["active", "on_hold", "completed"])` in `src/lib/actions/projects.ts:74`.

### Legacy status mapping (read-time, no migration)
Live prod DB (`cubicle`) status distribution:
- active: 101, completed: 5, on_hold: 4, draft: 1, review: 1, cancelled: 1.

Legacy statuses `draft` and `review` (semantically "in progress") must still appear under the Active tab so no project disappears. `cancelled` and `archived` stay hidden (they are archived/deleted by design).

**Mapping:**
- Active tab → `status IN ('active', 'draft', 'review')`
- On Hold tab → `status = 'on_hold'`
- Completed tab → `status = 'completed'`
- `cancelled`, `archived` → hidden.

---

## Tasks

### Task 1: Simplify `PROJECT_STATUS_TABS` and add status-mapping helper

**Files:**
- Modify: `src/lib/project-list-filters.ts`

Change `PROJECT_STATUS_TABS` to 3 values and add a helper that returns the SQL condition for a tab:

```ts
export const PROJECT_STATUS_TABS = ["active", "on_hold", "completed"] as const;

export type ProjectStatusTab = (typeof PROJECT_STATUS_TABS)[number];
export type ProjectBillingType = "fixed_price" | "hourly" | "retainer" | "package";

/** Status values grouped under each tab. Legacy "draft"/"review" fold into "active". */
export const PROJECT_STATUS_TAB_VALUES: Record<ProjectStatusTab, readonly string[]> = {
  active: ["active", "draft", "review"],
  on_hold: ["on_hold"],
  completed: ["completed"],
};

export function parseBillingType(raw?: string): ProjectBillingType | undefined {
  if (raw === "project") return "fixed_price";
  if (raw === "hours") return "hourly";
  return raw === "fixed_price" || raw === "hourly" || raw === "retainer" || raw === "package" ? raw : undefined;
}

export function buildProjectsHref(filters: {
  status: ProjectStatusTab;
  clientId?: string;
  billingType?: ProjectBillingType;
}): string {
  const params = new URLSearchParams();
  if (filters.status !== "active") params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.billingType) params.set("billingType", filters.billingType);
  const query = params.toString();
  return query ? `/app/projects?${query}` : "/app/projects";
}
```

Verify: `PROJECT_STATUS_TABS` now has exactly 3 entries; no other file references removed members. (Only `page.tsx` and this file import `PROJECT_STATUS_TABS`.)

### Task 2: Wire tabs + counts + status-mapped query in the Projects page

**Files:**
- Modify: `src/app/(app)/app/projects/page.tsx`

1. Import `StatusFilterTabs` and the new `PROJECT_STATUS_TAB_VALUES`.

```tsx
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import {
  PROJECT_STATUS_TABS,
  PROJECT_STATUS_TAB_VALUES,
  buildProjectsHref,
  parseBillingType,
  type ProjectStatusTab,
} from "@/lib/project-list-filters";
```

2. Replace the single status `whereClause` (line 99) with an `inArray` using the tab's values:

```tsx
import { inArray } from "drizzle-orm";
// ...
const whereClauses: SQL[] = [eq(projects.workspaceId, workspaceId)];
whereClauses.push(inArray(projects.status, PROJECT_STATUS_TAB_VALUES[statusTab]));
if (clientId) whereClauses.push(eq(projects.clientId, clientId));
if (billingType === "package") whereClauses.push(eq(projects.billingType, "package"));
else if (billingType) whereClauses.push(eq(projects.billingModel, billingType));
```

3. Add a per-status count query (after `clientOptions`), mapping legacy statuses into tabs:

```tsx
const countRows = await db
  .select({ status: projects.status, count: sql<number>`count(*)::int` })
  .from(projects)
  .where(eq(projects.workspaceId, workspaceId))
  .groupBy(projects.status);

const statusCounts: Record<ProjectStatusTab, number> = { active: 0, on_hold: 0, completed: 0 };
for (const row of countRows) {
  const n = Number(row.count) || 0;
  if (PROJECT_STATUS_TAB_VALUES.active.includes(row.status)) statusCounts.active += n;
  else if (row.status === "on_hold") statusCounts.on_hold = n;
  else if (row.status === "completed") statusCounts.completed = n;
}
```

4. Render `StatusFilterTabs` right after the `app-page-header` block (before the `isAtLimit` banner), matching the Proposals page pattern:

```tsx
<StatusFilterTabs
  activeValue={statusTab}
  hideEmpty={false}
  tabs={PROJECT_STATUS_TABS.map((tab) => ({
    value: tab,
    label: tabLabel(tab),
    href: buildProjectsHref({ ...filtersForHref, status: tab }),
    count: statusCounts[tab] ?? 0,
    alwaysShow: true,
  }))}
/>
```

5. Remove `status` from `ActiveFilterSummary` filters (tabs now convey status). Keep `clientId` and `billingType`:

```tsx
<ActiveFilterSummary basePath="/app/projects" filters={[
  { key: "clientId", label: t("Klien", "Client"), value: selectedClient?.name },
  { key: "billingType", label: t("Model", "Model"), value: billingType === "fixed_price" ? "Fixed Price" : billingType === "hourly" ? t("Per Jam", "Hourly") : billingType === "retainer" ? "Retainer" : billingType === "package" ? t("Paket", "Package") : undefined },
]} />
```

6. `PROJECT_STATUS_LABELS` should now map only the 3 tab values (keep `draft`/`cancelled`/`archived` keys removed or harmless — simplest: keep only `active`, `on_hold`, `completed`):

```tsx
const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: t("Aktif", "Active"),
  on_hold: t("Ditunda", "On Hold"),
  completed: t("Selesai", "Completed"),
};
```

### Task 3: Remove status dropdown from the table header

**Files:**
- Modify: `src/components/projects/projects-list-table.tsx`

The `Status` header cell (lines 208-215) currently renders a `TableHeaderFilter` with `queryKey="status"`. Replace it with a plain non-interactive header label:

```tsx
<div className="col-span-2">
  <span className="text-xs font-medium text-muted-foreground">{t("Status", "Status")}</span>
</div>
```

Remove the now-unused `statusTab` prop from the component signature and from the destructure. Keep `TableHeaderFilter` for Client and Progress (billingType). Note the component still imports `TableHeaderFilter` (used for clientId + billingType) — do not remove the import.

Update the empty-state condition (line 239): `statusTab` no longer exists, so change:

```tsx
description={
  hasExtraFilters
    ? t("Tidak ada proyek untuk filter ini. Coba ubah status atau klien.", "No projects match these filters. Try another status or client.")
    : t("Buat proyek pertama untuk mulai pantau pekerjaan.", "Create your first project to start tracking work.")
}
```

Also remove the `statusTab` from the call site in `page.tsx` (`<ProjectsListTable ... statusTab={statusTab} ...>`).

### Task 4: Make the navbar "New" button consistent with other pages

**Files:**
- Modify: `src/components/app-topbar.tsx`

The button currently collapses to a bare `+` square on `/app/projects` because of this special-case in the label span (lines 287-292):

```tsx
<span className={cn("hidden sm:inline", pathname === "/app/projects" && "lg:hidden")}>
  {t("Baru", "New")}
</span>
```

Remove the `pathname === "/app/projects" && "lg:hidden"` special-case so the label renders identically on the Projects page as on every other page. Keep the button and its full dropdown (Client/Proposal/Questionnaire/Invoice) unchanged.

```tsx
<span className="hidden sm:inline">
  {t("Baru", "New")}
</span>
```

`cn` is used ONLY at line 289 and `pathname` is used ONLY at line 289 (declared at line 95). After removing the special-case, BOTH become unused. Remove them:
- Delete `const pathname = usePathname();` (line 95) — and the `usePathname` import if now unused.
- Remove `cn` from the `@/lib/utils` import (line 44: `import { cn } from "@/lib/utils";`) if no other `cn(...)` usage remains.

Verify with `npx eslint src/components/app-topbar.tsx` — must be clean (no `no-unused-vars`).

### Task 5: Update wiring test

**Files:**
- Modify: `src/lib/table-header-filter-wiring.test.ts`

Update the first `it(...)` to reflect the new reality:

```ts
it("moves project filters into table headers", () => {
  const page = read("src/app/(app)/app/projects/page.tsx");
  const table = read("src/components/projects/projects-list-table.tsx");
  expect(page).toContain("<StatusFilterTabs");
  expect(page).not.toContain("<ProjectFilters");
  expect(table).toContain("TableHeaderFilter");
  expect(table).toContain('queryKey="clientId"');
  expect(table).not.toContain('queryKey="status"');
  expect(table).toContain('queryKey="billingType"');
});
```

### Task 6: Verify (tests, typecheck, lint, build)

Run from repo root `/root/projects/cubicle`:

```bash
npx vitest run src/lib/table-header-filter-wiring.test.ts
npx tsc --noEmit
npx eslint src/lib/project-list-filters.ts src/app/\(app\)/app/projects/page.tsx src/components/projects/projects-list-table.tsx src/components/app-topbar.tsx src/lib/table-header-filter-wiring.test.ts
```

Expected: targeted test passes, `tsc` clean, eslint clean. Optionally run the full unit test suite: `npx vitest run` (do not run e2e).

---

## Non-negotiables

- **Preserve unrelated dirty changes.** Snapshot `git status --short` before/after; only touch the 5 files listed.
- **No data migration** — read-time mapping only.
- **Bilingual strings** — every new user-facing string uses `t("id", "en")`.
- **No project-level Traefik/nginx on 80/443** — this is a code-only change; no infra deploy unless explicitly requested.
- Commit only the 5 files with a clear message: `feat(projects): 3-tab status filter + hide navbar New on projects`.
