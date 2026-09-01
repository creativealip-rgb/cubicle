# MFA Guided Wizard Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace MFA setup card with premium two-step guided wizard while preserving verified passkey/TOTP security behavior.

**Architecture:** Keep auth mutations and route guards unchanged. Extract small pure UI-state helpers for testable wizard transitions; render method, authenticator, recovery, and completion states inside existing `MfaSetupForm`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Better Auth, Vitest, Playwright.

---

### Task 1: Lock wizard states with tests

**Objective:** Define minimal state labels, progress, and recovery confirmation gate before changing UI.

**Files:**
- Create: `src/lib/mfa/setup-wizard.ts`
- Create: `src/lib/mfa/setup-wizard.test.ts`

**Steps:**
1. Write failing tests for method, authenticator, recovery, and completion state metadata.
2. Test `canContinueFromRecovery(codes, confirmed)` returns true only with codes and confirmation.
3. Run `npx vitest run src/lib/mfa/setup-wizard.test.ts`; expect failure.
4. Add pure typed helpers with no React dependency.
5. Re-run; expect PASS.
6. Commit: `test: define MFA wizard states`.

### Task 2: Build guided method selection

**Objective:** Replace generic initial card with gradient wizard header and explicit passkey/authenticator choices.

**Files:**
- Modify: `src/components/auth/mfa-setup-form.tsx`
- Test: `src/lib/mfa/setup-wizard.test.ts`

**Steps:**
1. Add source assertions for `Step 1 of 2`, `Recommended`, passkey benefit, and authenticator benefit.
2. Run focused test; expect failure.
3. Render centered `max-w-[520px]` shell, purple gradient header, two-segment progress, and stacked 44px method actions.
4. Keep existing passkey mutation and error handling; authenticator selection advances to password state.
5. Run focused tests, TypeScript, and ESLint; expect PASS.
6. Commit: `feat: add guided MFA method selection`.

### Task 3: Polish authenticator verification

**Objective:** Present password, manual URI, six-digit verification, and errors as clear step-two states.

**Files:**
- Modify: `src/components/auth/mfa-setup-form.tsx`
- Test: `src/lib/mfa/setup-wizard.test.ts`

**Steps:**
1. Add failing assertions for `Step 2 of 2`, persistent labels, copyable URI, numeric input, and accessible alert.
2. Add step-two header/progress and compact manual setup block.
3. Preserve Better Auth enable/verify calls and secret handling.
4. Contain long URI with overflow-safe styling; add native clipboard copy button without dependency.
5. Run focused tests, TypeScript, and ESLint; expect PASS.
6. Commit: `feat: guide authenticator verification`.

### Task 4: Gate recovery-code completion

**Objective:** Require user acknowledgment before leaving recovery-code screen.

**Files:**
- Modify: `src/components/auth/mfa-setup-form.tsx`
- Test: `src/lib/mfa/setup-wizard.test.ts`

**Steps:**
1. Add failing test for recovery confirmation gate.
2. Keep recovery codes only in component memory.
3. Add copy-all and text-file download using browser-native APIs.
4. Add `I saved my recovery codes` checkbox.
5. Disable dashboard CTA until checked; passkey completion bypasses this gate because no new TOTP recovery-code screen exists.
6. Run focused tests, TypeScript, and ESLint; expect PASS.
7. Commit: `feat: gate MFA recovery completion`.

### Task 5: Polish completion state

**Objective:** Make next action unmistakable without repetitive copy.

**Files:**
- Modify: `src/components/auth/mfa-setup-form.tsx`

**Steps:**
1. Render `Two-step verification is ready`, one concise explanation, and full-width `Continue to dashboard` CTA.
2. Keep explicit navigation and active-MFA `/mfa/setup` redirect.
3. Verify `role=status`, focus visibility, and reduced-motion-safe presentation.
4. Run focused tests, TypeScript, and ESLint; expect PASS.
5. Commit: `feat: polish MFA completion state`.

### Task 6: Full gates and browser QA

**Objective:** Prove both branches, mobile layout, DB persistence, and no loops.

**Files:**
- Modify only if QA finds defects.

**Steps:**
1. Run `npx vitest run`; expect all tests PASS.
2. Run `npx tsc --noEmit --pretty false`; expect PASS.
3. Run `npm run lint`; expect PASS.
4. Run `npm run build`; expect PASS.
5. Run `git diff --check`; expect PASS.
6. Deploy dev through `scripts/operations/deploy-dev-integration.sh` after deployment guardrails.
7. Playwright at 390×844: screenshot method, passkey completion, authenticator URI/code, recovery codes, completion, dashboard.
8. Require virtual WebAuthn credential, DB factor/flag proof, reload/re-entry redirect, zero overflow, clean browser/server errors.
9. Commit QA fixes separately, rerun all gates, push.
10. With explicit production approval already present for this continuation, backup/check production, deploy exact SHA through `dokploy-traefik`, and repeat health plus MFA smoke proof.

## Acceptance

- Two-step wizard visually matches approved option B.
- Existing passkey and TOTP security invariants remain intact.
- Recovery codes cannot be skipped accidentally.
- Every state has one clear primary action.
- 390×844 viewport has zero horizontal overflow.
- Full technical gates and live browser/DB evidence pass.
- No project container binds public ports 80/443.
