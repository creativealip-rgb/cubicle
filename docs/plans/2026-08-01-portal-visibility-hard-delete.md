# Portal Visibility and Permanent Delete Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make project portal visibility controllable and add explicit permanent deletion for Client, Project, and Task, including related records.

**Architecture:** `ProjectForm` owns visibility input and defaults it on when launched from a Client detail page. Workspace-scoped server actions perform destructive deletes inside database transactions using an FK-audited child-first deletion order. Shared typed-name confirmation dialog exposes destructive actions on detail/task surfaces.

**Tech Stack:** Next.js 16 Server Actions, React 19, Drizzle ORM, PostgreSQL, Vitest.

---

### Task 1: Lock portal visibility contract with tests

**Files:**
- Create: `src/lib/project-portal-visibility-delete-wiring.test.ts`
- Modify: `src/components/forms/project-form.tsx`

1. Add source contract tests for visible checkbox/help copy and `clientId ? true : false` create default.
2. Run focused test and confirm RED.
3. Render checkbox in create/edit Project form; keep Client selector hidden when `clientId` prop exists.
4. Run focused test and confirm GREEN.

### Task 2: Lock destructive action contracts with tests

**Files:**
- Modify: `src/lib/project-portal-visibility-delete-wiring.test.ts`
- Modify: `src/lib/actions/clients.ts`
- Modify: `src/lib/actions/projects.ts`
- Modify: `src/lib/actions/tasks.ts`

1. Add RED assertions for workspace authorization, transaction boundaries, explicit child deletion, and parent deletion.
2. Audit all schema FKs for Client/Project/Task.
3. Implement minimal workspace-scoped transactional actions.
4. Run focused tests and TypeScript.

### Task 3: Add typed permanent-delete UI

**Files:**
- Create: `src/components/shared/permanent-delete-button.tsx`
- Modify: `src/app/(app)/app/clients/[clientId]/page.tsx`
- Modify: `src/app/(app)/app/projects/[projectId]/page.tsx`
- Modify: task workspace components.

1. Add RED source contracts for typed-name confirmation and destructive copy.
2. Implement shared dialog and entity action adapters.
3. Wire Client/Project detail and workflow/reusable task rows.
4. Verify redirect/refresh after success and visible errors on failure.

### Task 4: Verify end to end

1. Run focused Vitest suites.
2. Run full `npm test` if bounded runtime permits.
3. Run `npm run lint -- --max-warnings=0`.
4. Run `npx tsc --noEmit`.
5. Run `npm run build`.
6. Browser-test create/edit portal visibility and a disposable delete chain; verify reload persistence, portal visibility, database removal, browser console, and server logs.
7. Do not deploy without explicit request.
