# Settings Hardening Implementation Plan

> **For Hermes:** Execute task-by-task with TDD and preserve unrelated local changes.

**Goal:** Fix SET-001 through SET-010: secure Settings mutations, align UI/API behavior, improve account UX/i18n/a11y, add regression coverage, and deploy safely.

**Architecture:** Extract pure validation helpers for upload bytes and password input so they can be tested without Next/DB mocks. Enforce owner authorization at every workspace-wide mutation boundary and pass a single `canEdit` state into UI. Use existing Better Auth API for session revocation where supported, preserving current session.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Better Auth, Drizzle, R2/S3, Docker, Dokploy Traefik.

---

### Task 1: Pure validation regression tests

**Files:**
- Create: `src/lib/settings-validation.ts`
- Create: `src/lib/settings-validation.test.ts`
- Modify: `src/app/api/workspace/logo/route.ts`
- Modify: `src/lib/actions/account.ts`

1. Write tests for PNG/JPEG/WebP/GIF signatures, MIME mismatch, forged payload, password whitespace preservation, and password policy.
2. Run targeted test; expect failure because helper does not exist.
3. Add minimal helpers and wire route/action.
4. Run targeted test; expect pass.

### Task 2: Owner authorization

**Files:**
- Modify: `src/lib/actions/workspace.ts`
- Modify: `src/lib/actions/currency-rates.ts`
- Modify: `src/app/api/workspace/logo/route.ts`
- Modify: `src/app/(app)/app/settings/page.tsx`
- Modify Settings form components as required.

1. Add source-level regression checks or pure policy tests.
2. Replace writable checks with owner checks for workspace identity, branding, booking slug, FX rates, and logo.
3. Pass `canEditWorkspace`; disable/hide mutation controls for non-owner.
4. Run targeted tests and TypeScript.

### Task 3: Password and sessions

**Files:**
- Modify: `src/lib/actions/account.ts`
- Modify: `src/components/settings/account-settings-form.tsx`

1. Add confirmation input, required/minLength, mismatch feedback, and disabled invalid submit.
2. Preserve password bytes; never trim.
3. Revoke other sessions using Better Auth API after successful password update; retain current session.
4. Add translated labels/toasts/helper text via `useT()`.
5. Verify targeted tests.

### Task 4: Destructive action safety and accessibility

**Files:**
- Modify: `src/components/settings/workspace-branding-form.tsx`
- Modify: `src/components/settings/google-calendar-connect.tsx`
- Modify: `src/components/settings/team-manager.tsx`

1. Confirm logo removal and Calendar disconnect.
2. Member removal confirmation names email/name target.
3. Add accessible labels and >=44px hit targets.
4. Align raster-only copy, accept list, and client MIME allowlist.

### Task 5: Verification and release

1. Run targeted tests.
2. Run full `npm test`.
3. Run lint for changed source and full lint; distinguish pre-existing failures.
4. Run `npm run build` and `git diff --check`.
5. Review diff for unrelated changes and secrets.
6. Run `/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh` from project.
7. Confirm only `dokploy-traefik` owns 80/443 and no catch-all project router.
8. Commit conventional commit, push current branch, rebuild/recreate existing Cubiqlo app without changing routing.
9. Verify health, `app.cubiqlo.com`, `cubiqlo.com`, and unrelated domain.
10. Browser-check Settings desktop/mobile and update QA backlog with exact completion/remaining exceptions.
