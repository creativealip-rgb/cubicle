# Client Portal ID/EN Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add persistent Indonesian/English switching to every Client Portal-owned UI string using Cubiqlo's existing `cubiqlo_lang` infrastructure.

**Architecture:** Server route reads language cookie and translates server-rendered copy with `createT`; portal subtree uses existing `LangProvider`; client portal components call `useT`; one accessible portal switch updates optimistic state and refreshes server components. User/database content stays unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing Cubiqlo i18n helpers, Vitest, Docker Compose.

---

### Task 1: Add testable portal translation helpers

**Files:**
- Create: `src/lib/portal-i18n.ts`
- Create: `src/lib/portal-i18n.test.ts`
- Modify: `src/lib/portal-presentation.ts`
- Test: `src/lib/portal-i18n.test.ts`

**Steps:**
1. Write failing tests for language normalization, locale selection, project progress, request type/status, project/task/file/invoice statuses in ID and EN.
2. Run `npx vitest run src/lib/portal-i18n.test.ts`; expect failure because helper does not exist.
3. Implement typed translation/status helpers without translating database content.
4. Reuse helpers from portal presentation where applicable.
5. Run targeted tests; expect pass.

### Task 2: Wire server language and provider

**Files:**
- Modify: `src/app/client-portal/[token]/page.tsx`
- Modify: `src/components/portal/portal-tabs.tsx`
- Create: `src/components/portal/portal-language-switch.tsx`

**Steps:**
1. Read language via `getCurrentLang()` and create server translator.
2. Wrap portal UI in `LangProvider`.
3. Add accessible `ID | EN` switch in portal header with 44 px targets and pending lock.
4. Translate server-rendered headings, summary metrics, fallback labels, date formatting, and prop labels.
5. Run `npx tsc --noEmit`; expect pass.

### Task 3: Translate overview, requests, and actions

**Files:**
- Modify: `src/components/portal/portal-tabs.tsx`
- Modify: `src/components/portal/portal-request-list.tsx`
- Modify: `src/components/portal/portal-action-buttons.tsx`
- Modify: `src/components/portal/portal-task-list.tsx`
- Modify: `src/components/portal/activity-feed.tsx`

**Steps:**
1. Add `useT()` to each client component.
2. Translate tabs, headings, helper text, empty states, request metadata labels, status/action buttons, timeline labels, toast/error UI.
3. Use active locale for client date formatting.
4. Preserve all database-provided titles/descriptions.
5. Run targeted tests and typecheck.

### Task 4: Translate projects and packages

**Files:**
- Modify: `src/components/portal/project-accordion.tsx`
- Modify: `src/components/portal/portal-project-card.tsx`
- Modify: `src/components/portal/custom-package-request-form.tsx`
- Modify: `src/components/portal/package-order-button.tsx`

**Steps:**
1. Translate project status, progress, billing, task/file/timeline section headings, package/order states, dialog forms, validation, and actions.
2. Format dates using active locale.
3. Keep project/package names and user-entered content unchanged.
4. Run tests and typecheck.

### Task 5: Translate Files, Invoices, and Contact

**Files:**
- Modify: `src/components/portal/portal-file-manager.tsx`
- Modify: `src/components/portal/portal-file-list.tsx`
- Modify: `src/components/portal/portal-invoices.tsx`
- Modify: `src/components/portal/portal-contact.tsx`

**Steps:**
1. Translate upload guidance, folder breadcrumbs, file empty states, accessible download labels, invoice labels/history/status, contact guidance, and channel labels.
2. Keep filenames, folder names, invoice numbers, workspace/client names unchanged.
3. Apply `id-ID`/`en-US` date formatting.
4. Run tests and typecheck.

### Task 6: Sweep loading and residual portal copy

**Files:**
- Modify: `src/components/portal/portal-loading.tsx`
- Modify any remaining portal-owned component found by scan.

**Steps:**
1. Scan portal route/components for hardcoded visible Indonesian or English UI strings.
2. Translate residual loading, aria, title, placeholder, validation, and toast strings.
3. Confirm API/server error responses are safely mapped, not exposed raw.
4. Run full tests, typecheck, and production build.

### Task 7: Browser QA and deployment

**Files:**
- Update existing QA script under `/tmp` if needed; do not commit temporary artifacts.

**Steps:**
1. Read deployment guardrails and run `PRE_DEPLOY_CHECK.sh`.
2. Build/recreate only Cubiqlo app container.
3. Verify health and logs.
4. Test ID and EN at desktop and 390×844 across Overview, Projects, Files, Invoices, Contact.
5. Verify switch persistence after reload/new tab, no console errors, no overflow, 44 px controls, correct locale dates, unchanged DB content.
6. Verify `dokploy-traefik` remains sole public 80/443 owner.

### Task 8: Documentation and commit

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/feature-status.md`
- Modify: `docs/client-portal-audit-2026-07-25.md`
- Modify shared workspace context/log/index after successful deploy.

**Steps:**
1. Record bilingual implementation and real verification evidence.
2. Run `git diff --check` and inspect final diff for accidental unrelated files/secrets.
3. Commit with conventional commit message and push current branch.
4. Leave `.superpowers/brainstorm/` untouched.

## Final acceptance

- ID/EN switch visible and accessible in portal header.
- `cubiqlo_lang` persists and matches dashboard behavior.
- Every portal-owned visible string supports ID and EN.
- Dates/statuses use active locale.
- Database content remains unchanged.
- Tests, typecheck, build, Docker deploy, live browser QA, health, logs, and proxy checks pass.
