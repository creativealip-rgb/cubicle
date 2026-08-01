# Google Auth and Session Lifetime Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Google login/signup and enforce seven-day idle plus 30-day absolute session lifetime.

**Architecture:** Better Auth owns Google OAuth and sliding session expiry. A focused session policy callback/guard enforces absolute age without changing auth consumers. Login and signup share one Google action component.

**Tech Stack:** Next.js 16, Better Auth 1.6, Drizzle/PostgreSQL, React 19, Vitest.

---

### Task 1: Add auth policy tests

**Files:**
- Create: `src/lib/auth-policy.test.ts`
- Create: `src/lib/auth-policy.ts`

1. Write tests for seven-day idle constants and 30-day absolute expiry.
2. Run focused Vitest and confirm RED.
3. Implement pure policy helpers.
4. Run focused test and confirm PASS.

### Task 2: Configure Better Auth Google and sessions

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/auth-environment.ts` if required

1. Add Google provider from runtime env.
2. Enable safe verified-email account linking.
3. Configure seven-day `expiresIn` and a refresh `updateAge`.
4. Apply 30-day absolute policy through Better Auth lifecycle hooks/callbacks supported by installed version.
5. Add source-level tests for provider/session wiring.

### Task 3: Add shared Google auth UI

**Files:**
- Create: `src/components/auth/google-auth-button.tsx`
- Modify: `src/components/auth/login-form.tsx`
- Modify: signup form discovered in `src/components/auth/`

1. Add client action using `authClient.signIn.social({ provider: "google", callbackURL })`.
2. Render divider and button in Login and Signup.
3. Preserve requested safe redirect on Login; Signup defaults to onboarding.
4. Add loading and localized error states.

### Task 4: Verify locally

1. Run focused tests.
2. Run full TypeScript/Next Docker build.
3. Inspect generated OAuth redirect and callback URL without completing external account consent.
4. Confirm no secret appears in Git diff.

### Task 5: Configure runtime, deploy, and smoke-test

1. Keep secrets outside Git; source Google values from protected credential/env source.
2. Preserve live target: `cubiqlo-new-pg` database `cubicle`.
3. Run deploy collision checks.
4. Build immutable image and recreate `cubiqlo-new-app` with one value per env key.
5. Verify health, Login/Signup Google buttons, OAuth redirect callback, logs, and unrelated-domain routing.
6. Commit and push only intended files.
