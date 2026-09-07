# Password + Email OTP Login and Recovery Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Require password plus email OTP on untrusted browsers, trust verified browsers for 30 days, and support lost-email recovery through passkey, backup code, or audited admin handoff.

**Architecture:** Custom pre-session login challenge verifies Better Auth credential hashes without calling `signIn.email`; only trusted-device or OTP success creates a Better Auth session. Additive PostgreSQL tables own OTP challenges, trusted devices, and scoped one-time recovery handoffs. Existing passkey/TOTP data stays intact; normal login and app layout stop enforcing legacy MFA.

**Tech Stack:** Next.js 16 App Router, Better Auth 1.7.2, Drizzle/PostgreSQL, Resend transport, Redis rate limits, Vitest, Playwright.

---

### Task 1: Lock auth state-machine contracts

**Files:**
- Create: `src/lib/auth-login/state-machine.ts`
- Create: `src/lib/auth-login/state-machine.test.ts`
- Modify: `src/lib/mfa/auth-plugin.wiring.test.ts`
- Modify: `src/lib/mfa/policy.test.ts`

**Steps:**
1. Write failing tests for `password_pending`, `otp_pending`, `authenticated`, trusted-device bypass, expiration, and legacy MFA non-enforcement.
2. Run `npx vitest run src/lib/auth-login/state-machine.test.ts src/lib/mfa/auth-plugin.wiring.test.ts src/lib/mfa/policy.test.ts`; expect failures against old routing.
3. Add pure transition helpers; no DB or cookie code.
4. Update legacy assertions: preserve plugin/data, remove normal `/two-factor` and `/mfa/setup` requirements.
5. Rerun; expect PASS.
6. Commit `test: lock password email OTP auth state machine`.

### Task 2: Add additive auth challenge schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0091_password_email_otp_recovery.sql`
- Create: `src/lib/auth-login/schema-contract.test.ts`

**Steps:**
1. Write failing schema/migration tests for `auth_login_otp_challenges`, `auth_trusted_devices`, `auth_recovery_handoffs`, session-bound recovery authorization, FKs to text `users.id`, expiry/check constraints, and active-challenge uniqueness.
2. Run targeted test; expect missing tables.
3. Add exact Drizzle declarations and idempotent SQL migration.
4. Include partial unique active challenge index or transactional replacement invariant, token-hash uniqueness, and cleanup indexes.
5. Apply migration twice against disposable PostgreSQL fixture; expect both runs successful.
6. Commit `feat: add email OTP and trusted device schema`.

### Task 3: Implement cryptographic primitives

**Files:**
- Create: `src/lib/auth-login/crypto.ts`
- Create: `src/lib/auth-login/crypto.test.ts`

**Steps:**
1. Write failing tests for six-digit crypto OTP generation, random bearer tokens, HMAC verifier, timing-safe compare, email masking, and 30-day expiry.
2. Run test; expect missing implementation.
3. Implement with `node:crypto`; use server secret domain separation and never plaintext storage.
4. Rerun; expect PASS.
5. Commit `feat: add login challenge crypto primitives`.

### Task 4: Build pre-session password challenge service

**Files:**
- Create: `src/lib/auth-login/service.ts`
- Create: `src/lib/auth-login/service.test.ts`
- Create: `src/app/api/auth/password-login/start/route.ts`

**Steps:**
1. Write failing tests: normalize email, verify only credential account using `verifyPassword`, generic unknown/wrong-password result, no session before second factor, trusted cookie owner/hash/expiry/revocation validation, and rate limits per email/IP.
2. Run tests; expect failures.
3. Implement service transaction and start route. Do not call `authClient.signIn.email` or Better Auth passwordless email OTP.
4. If trusted device valid, create Better Auth session through one audited server helper; otherwise create/replace one OTP challenge.
5. Rerun tests; prove pending challenge is rejected by `requireAppSession`.
6. Commit `feat: add pre-session password login challenge`.

### Task 5: Deliver and verify email OTP atomically

**Files:**
- Create: `src/app/api/auth/password-login/verify/route.ts`
- Create: `src/app/api/auth/password-login/resend/route.ts`
- Create: `src/lib/auth-login/email.ts`
- Modify: `src/lib/auth-login/service.ts`
- Test: `src/lib/auth-login/service.test.ts`

**Steps:**
1. Add failing tests for 10-minute expiry, five attempts, 60-second cooldown, resend invalidation, single-use race, generic errors, and no secret logging.
2. Add localized Resend email template using existing `sendNotification` transport.
3. Implement row-lock/conditional atomic verification and challenge consumption.
4. On success create session + 30-day trusted record/cookie in same logical operation; compensate/revoke on partial failure.
5. Run tests including concurrent verify; expect exactly one success.
6. Commit `feat: verify password login with email OTP`.

### Task 6: Replace login UI

**Files:**
- Modify: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/email-otp-form.tsx`
- Modify: `src/lib/auth-client.ts` only if custom typed client helper is needed
- Create: `src/components/auth/email-otp-form.test.tsx`

**Steps:**
1. Write failing wiring/component tests proving login calls custom start endpoint, never `signIn.email`, never routes `/two-factor`, masks email, renders six cells/input, resend countdown, expiry and accessible live errors.
2. Implement minimal two-stage card and safe redirect preservation.
3. Test desktop and 390px rendering.
4. Commit `feat: add password and email OTP login UI`.

### Task 7: Remove mandatory legacy MFA routing

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/lib/mfa/enforcement.ts`
- Modify: `src/lib/mfa/policy.ts`
- Modify: `src/app/(auth)/mfa/setup/page.tsx`
- Modify: `src/components/auth/two-factor-form.tsx`
- Tests: existing MFA policy/wiring tests

**Steps:**
1. Write failing tests that `twoFactorEnabled` never blocks `/app/*` and normal login has no passkey/TOTP CTA.
2. Remove layout enrollment redirect; retain routes only behind rollback/admin-safe access.
3. Preserve `twoFactor()`, passkey plugin, DB rows, and legacy flags.
4. Rerun affected tests.
5. Commit `feat: stop mandatory passkey and TOTP login`.

### Task 8: Integrate logout and trusted-device revocation

**Files:**
- Modify: `src/app/api/auth/sign-out/route.ts`
- Modify: `src/lib/actions/account.ts`
- Modify: `src/components/app-topbar.tsx`
- Modify: `src/components/settings/account-security-settings.tsx`
- Create: `src/lib/auth-login/logout.test.ts`

**Steps:**
1. Write failing tests: Logout revokes current session/device/challenge cookie; Logout All revokes every user session/device/challenge/recovery authorization.
2. Implement transaction-backed revocation helpers and cookie clearing.
3. Rename/replace current `signOutOtherSessions` UX with explicit Logout All Devices while preserving revoke-one session/device controls.
4. Run tests.
5. Commit `feat: revoke trusted devices on logout`.

### Task 9: Revoke auth state on password change/reset

**Files:**
- Modify: `src/lib/actions/account.ts`
- Modify: `src/lib/auth.ts`
- Create/modify: password-reset completion hook tests

**Steps:**
1. Write failing tests proving password update/reset revokes old sessions, all trusted devices, OTP challenges, and recovery authorizations; reset browser is not trusted.
2. Add shared `revokeUserAuthState` service and invoke only after password persistence succeeds.
3. Preserve current Forgot Password request/link UX.
4. Run tests.
5. Commit `feat: revoke auth state after password reset`.

### Task 10: Implement passkey recovery

**Files:**
- Create: `src/app/(auth)/recover-access/page.tsx`
- Create: `src/components/auth/access-recovery-form.tsx`
- Create: `src/app/api/auth/recovery/passkey/start/route.ts`
- Create: `src/app/api/auth/recovery/passkey/verify/route.ts`
- Create: `src/lib/auth-recovery/service.ts`
- Tests: `src/lib/auth-recovery/passkey.test.ts`

**Steps:**
1. Write failing WebAuthn challenge tests for registered-user passkeys, origin/RP validation, rate limits, one-time challenge, and generic account-existence response.
2. Reuse Better Auth passkey verification primitives; do not treat ordinary passkey sign-in session as recovery scope.
3. On verified assertion revoke old auth state and create session-bound recovery authorization + trusted browser.
4. Redirect Settings advisory.
5. Test with CDP virtual authenticator.
6. Commit `feat: recover lost email access with passkey`.

### Task 11: Implement atomic backup-code recovery

**Files:**
- Modify: `src/lib/auth-recovery/service.ts`
- Create: `src/app/api/auth/recovery/backup-code/route.ts`
- Create: `src/lib/auth-recovery/backup-code.test.ts`

**Steps:**
1. Write failing tests for row lock, Better Auth encoding compatibility, one-code removal, replay rejection, concurrency, and preservation of TOTP/passkey rows.
2. Use Better Auth backup-code decode/verify semantics; never plaintext assumptions.
3. Commit code consumption and recovery authorization atomically.
4. Run tests.
5. Commit `feat: recover lost email access with backup code`.

### Task 12: Fix manual admin recovery handoff

**Files:**
- Modify: `src/lib/actions/admin/mfa-recovery.ts`
- Create: `src/app/(auth)/recover-access/[token]/page.tsx`
- Create: `src/app/api/auth/recovery/redeem/route.ts`
- Modify: admin recovery tests

**Steps:**
1. Write failing tests that execution preserves passkeys/TOTP/unused backup codes, creates hashed short-lived one-time handoff, and cannot create user browser session directly.
2. Remove credential deletion from manual recovery execution.
3. Add audited handoff creation and browser redemption.
4. Redemption atomically consumes token, revokes old auth state, creates scoped session/trusted device, redirects Settings.
5. Run cooling-period, dual-approval, replay, expiry tests.
6. Commit `feat: add manual recovery browser handoff`.

### Task 13: Add scoped post-recovery email change

**Files:**
- Modify: `src/lib/actions/account.ts`
- Modify: `src/app/(app)/app/settings/page.tsx`
- Modify: account settings components
- Modify: `src/app/(auth)/verify-email-change/page.tsx` or existing handler
- Create: `src/lib/auth-recovery/email-change.test.ts`

**Steps:**
1. Write failing authorization matrix: normal session keeps password/current safeguards; fresh session-bound recovery authorization may verify new email without old inbox; stale/revoked/replayed claim fails.
2. Add nonblocking bilingual advisory banner.
3. Consume recovery authorization exactly once after verified new-email update; revoke other auth state again.
4. Ensure dashboard remains accessible before change.
5. Run tests.
6. Commit `feat: secure email change after account recovery`.

### Task 14: Reframe Settings recovery methods

**Files:**
- Modify: `src/app/(app)/app/settings/page.tsx`
- Modify: `src/components/settings/account-security-settings.tsx`
- Modify: `src/components/settings/account-security-settings.test.tsx`

**Steps:**
1. Write failing UI tests for Recovery Methods, passkeys, backup-code management, Trusted Devices, revoke-one/all; no TOTP login/recovery display.
2. Implement ID/EN copy. Keep TOTP query/data only where rollback compatibility requires it; do not render it.
3. Run accessibility/wiring tests.
4. Commit `feat: reframe account recovery settings`.

### Task 15: Preserve Google OAuth behavior

**Files:**
- Modify: auth integration tests and Google callback tests only if needed

**Steps:**
1. Write test proving successful Google OAuth creates normal session and no password-login trusted-device record.
2. Verify no OTP custom endpoint intercepts OAuth callbacks.
3. Run tests.
4. Commit `test: preserve Google OAuth login`.

### Task 16: Full verification and staged rollout

**Files:**
- Create: `docs/operations/evidence/password-email-otp-release-2026-09-07.md`
- Modify: `CHANGELOG.md`

**Steps:**
1. Run `npx vitest run`, `npm run lint`, `npm run build`, and `git diff --check`.
2. Apply migration twice to disposable DB, then backup/apply once to production only after deploy approval.
3. Build image with commit SHA; deploy behind `PASSWORD_EMAIL_OTP_LOGIN_ENABLED=false` first.
4. Run real Resend delivery with one disposable verified account: password → OTP → dashboard; prove no pre-OTP session in cookies/DB.
5. Verify trusted 30-day bypass, logout, logout-all across two browsers, invalid/expired/resend OTP, Forgot Password, backup code, CDP passkey, and manual handoff.
6. Verify DB rows without exposing secrets; clean disposable data.
7. Enable flag globally only after all auth gates pass; keep rollback available.
8. Verify health, logs, exact Host routing, unrelated domain, and sole `dokploy-traefik` ownership of 80/443.
9. Update evidence/changelog, commit, push.

## Completeness ledger

- `users.two_factor_enabled`: preserve/read-only legacy; no normal-login or app-layout enforcement.
- `two_factor` TOTP row: preserve, hide from login/recovery.
- Backup codes: preserve; one-time recovery consumption.
- `passkey`: preserve and use for lost-email recovery.
- `/two-factor`, `/mfa/setup`: hidden from normal flow; retained temporarily for rollback.
- Existing Forgot Password: preserve; add post-reset revocation.
- Existing Google OAuth: preserve unchanged; no trusted-device minting.
- Existing manual recovery approvals/audit: preserve; replace destructive execution with handoff.

## Final gate

No production enablement unless real OTP delivery, no-session-before-OTP proof, trusted-device revocation, recovery replay protection, and rollback are all PASS.
