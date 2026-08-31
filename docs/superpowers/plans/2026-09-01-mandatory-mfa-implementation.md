# Mandatory MFA Implementation Plan

> **For Hermes:** Execute task-by-task with strict TDD and requirement evidence.

**Goal:** Enforce MFA for every Cubiqlo account using passkeys or TOTP, single-use recovery codes, controlled rollout, step-up checks, and auditable recovery.

**Architecture:** Better Auth owns 2FA/passkey credentials and challenge endpoints. Cubiqlo owns enforcement policy, grace deadline, route guards, high-risk step-up state, recovery workflow, and audit UI. Rollout stays feature-flagged until migration rehearsal and browser QA pass.

**Tech Stack:** Next.js 16, Better Auth 1.6.22, `@better-auth/passkey` 1.6.22, Drizzle/PostgreSQL, Vitest, Playwright.

---

## Phase 1 — Plugin and schema foundation

### Task 1: Pin passkey dependency
- Modify `package.json`, `package-lock.json`.
- Add `@better-auth/passkey@1.6.22` only.
- Verify `npm install`, dependency tree, typecheck.

### Task 2: Add failing plugin wiring tests
- Create `src/lib/mfa/auth-plugin.wiring.test.ts`.
- Assert server uses `twoFactor()` and `passkey()`; client uses `twoFactorClient()` and `passkeyClient()` with `/two-factor` redirect.
- Run targeted Vitest and require RED.

### Task 3: Wire Better Auth plugins
- Modify `src/lib/auth.ts`, `src/lib/auth-client.ts`.
- Configure app name, TOTP/backup codes, WebAuthn RP ID/origin.
- Do not enable email OTP as primary MFA.
- Run targeted tests, typecheck, build.

### Task 4: Generate and review auth schema delta
- Generate Better Auth schema in a temporary path.
- Compare against `src/db/schema.ts` and current PostgreSQL schema.
- Add only required user fields/tables/indexes with correct text user FK types.
- Create additive `drizzle/0083_mandatory_mfa.sql` and update migration journal.
- Rehearse full migration chain on disposable PostgreSQL DB.

## Phase 2 — Policy and route enforcement

### Task 5: Pure MFA policy helper
- Create `src/lib/mfa/policy.ts` and behavior tests.
- Model feature flag, enrollment state, grace deadline, allowed setup/recovery routes, and enforcement decision.
- Test new users, existing users inside/outside grace, disabled rollout, public/auth routes.

### Task 6: Persist rollout/enrollment metadata
- Add application-owned fields only if Better Auth does not supply them: enrollment deadline/completion and recovery state.
- Add migration and DB tests.
- Never duplicate factor secrets.

### Task 7: Protected-route guard
- Modify `src/proxy.ts` and/or authenticated app layout using validated server session.
- Redirect incomplete accounts to `/mfa/setup`; allow setup/logout/recovery.
- Add redirect-loop and host-routing tests.

## Phase 3 — Enrollment and login challenge

### Task 8: TOTP enrollment UI
- Create `/mfa/setup` server page and client form.
- Require password re-auth for credential accounts, show QR/manual secret, verify TOTP before enable.
- Display backup codes once and require saved confirmation.
- Add component/action tests and mobile accessibility checks.

### Task 9: Passkey enrollment UI
- Add passkey registration as recommended first choice.
- Support device naming and multiple credentials.
- Verify RP ID/origin in production-like HTTPS browser tests.

### Task 10: Login challenge page
- Create `/two-factor` with passkey-first, TOTP, backup-code fallback.
- Modify login handling for Better Auth `twoFactorRedirect`.
- Add generic errors, `autocomplete="one-time-code"`, five-attempt backoff, and no account enumeration.

### Task 11: Google/OAuth enforcement
- Ensure social sign-in cannot bypass enrollment/challenge.
- Add OAuth callback/session policy tests.

## Phase 4 — Security settings and step-up

### Task 12: Security settings surface
- Add factor inventory, add/remove/rename passkey, regenerate backup codes, trusted devices, session revocation.
- Require current password where supported and fresh MFA challenge.

### Task 13: Step-up authorization primitive
- Create short-lived server-validated step-up proof bound to user/session/action.
- Require it for password/email/MFA changes, billing, role/owner changes, exports, and destructive account/workspace actions.
- Add action-level negative tests proving UI bypass cannot bypass server checks.

## Phase 5 — Recovery and administration

### Task 14: Self-service recovery
- Support remaining passkey, TOTP, or unused backup code.
- Consume backup codes atomically and revoke old set on regeneration.

### Task 15: Manual recovery workflow
- Add recovery request, 72-hour cooling period, old-email/session notifications, dual-admin approval, evidence metadata, and immutable audit trail.
- Revoke sessions/trusted devices and force password/email reset plus MFA reenrollment.
- No instant reset or direct secret access.

### Task 16: Admin security dashboard
- Show enrollment/deadline/recovery state only.
- Add recovery queue with two-person approval and audit timeline.

## Phase 6 — Release gates

### Task 17: Security verification matrix
- Unit/integration: policy, rate limit, backup-code atomicity, tenant boundary, CSRF/origin, secret redaction, step-up.
- Browser: password + Google login, passkey, TOTP, backup code, trusted device, enrollment redirects, settings, recovery, mobile/desktop.
- Verify no OTP/TOTP URI/challenge/recovery/session/reset secrets in logs.

### Task 18: Safe rollout
- Deploy schema/plugins with enforcement disabled.
- Internal production enrollment and recovery test.
- Start 14-day grace period only after QA PASS.
- Monitor failures/lockouts/recovery volume.
- Enforce globally after deadline; rollback only disables enforcement and never deletes factors.

## Completion gate

Completion requires every design acceptance criterion mapped to schema, server enforcement, UI, behavioral test, migration rehearsal, production browser proof, runtime logs, and rollback evidence. Plugin wiring or a successful build alone is not completion.
