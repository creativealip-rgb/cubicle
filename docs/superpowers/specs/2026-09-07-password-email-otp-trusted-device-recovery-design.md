# Password + Email OTP, Trusted Devices, and Account Recovery

Date: 2026-09-07
Status: Approved design — awaiting written-spec review

## Goal

Replace mandatory passkey/TOTP challenges during normal Cubiqlo login with password plus email OTP. A verified browser is trusted for 30 days. Keep passkeys and backup codes for recovery when the account email is unavailable; preserve manual admin recovery.

## Normal login

1. User submits normalized email and password.
2. Server verifies credentials without issuing a full application session.
3. If browser has a valid 30-day trusted-device credential for that exact user, create the normal session and continue to the validated redirect.
4. Otherwise generate and email a six-digit OTP and show `/login/verify-email-otp`.
5. Correct OTP creates the normal session, consumes the challenge, and stores a new trusted-device credential for 30 days.

Normal login never redirects to `/two-factor` and never asks for passkey or TOTP.

Do not use Better Auth 1.7.2 `signIn.emailOtp` for this flow: it is a passwordless sign-in endpoint and creates a session after OTP without proving the password step. Use Cubiqlo-owned password-login challenge endpoints, `@better-auth/utils/password` for credential verification, and Better Auth's internal/session API only after successful OTP verification. Do not call the normal `signIn.email` endpoint first because it can issue a session or trigger the legacy two-factor flow before email OTP succeeds.

Google OAuth remains a separate federated login method. A successful Google callback is accepted without Cubiqlo email OTP because Google already authenticates the mailbox account; it must not create a trusted-device record for password login. If product policy later requires step-up after OAuth, that is a separate rollout.

## Trusted device

Add user-scoped trusted-device records containing:

- random record ID;
- user ID;
- SHA-256 hash of a cryptographically random bearer token;
- optional device label and last-seen IP/user-agent metadata;
- expiration timestamp;
- created, last-used, and revoked timestamps.

Browser cookie contains only record ID plus raw random token. Cookie requirements:

- `HttpOnly`;
- `Secure` in production;
- `SameSite=Lax`;
- path `/`;
- maximum age 30 days.

Every login verifies record ownership, token hash with timing-safe comparison, expiration, and revocation. Successful reuse updates `last_used_at`. Invalid credentials are cleared. Trusted devices are not bound strictly to IP or user-agent because normal network/browser updates must not lock users out; metadata is informational and shown in Settings.

## OTP challenge security

- Six numeric digits generated with cryptographic randomness.
- Valid for 10 minutes.
- Stored only as an HMAC/SHA-256 verifier, never plaintext.
- Single active login OTP per user/device flow; resend invalidates prior code.
- Maximum five failed verification attempts, then challenge is locked/consumed.
- Resend cooldown: 60 seconds.
- Rate limits apply per normalized email, IP, and challenge.
- Request responses use generic copy and do not reveal account existence.
- Challenge cookie/ID is random, short-lived, `HttpOnly`, `Secure`, and `SameSite=Lax`.
- OTP verification atomically consumes challenge, creates session, and records trusted device; races cannot reuse one code.
- Delivery uses existing Cubiqlo Resend mail transport and localized ID/EN templates.

## Logout semantics

Normal Logout:

- revoke active session;
- revoke only trusted-device record represented by current browser cookie;
- clear both session and trusted-device cookies;
- invalidate active login OTP challenge cookies for that browser.

Logout All Devices:

- revoke all user sessions;
- revoke all user trusted devices;
- consume/delete all active login OTP challenges;
- clear local cookies.

The next login on every device requires password plus email OTP.

Password change and manual admin recovery also revoke all sessions, trusted devices, and active login OTP challenges.

## Recovery taxonomy

### Forgot password; email available

Keep existing Forgot Password email-link flow. It remains the normal password-reset path.

### Email unavailable

Expose three recovery methods:

1. **Passkey** — verify a registered WebAuthn credential.
2. **Backup code** — verify and atomically consume one existing Better Auth backup code.
3. **Manual admin recovery** — retain 72-hour cooling period, two distinct administrator approvals, and audit log.

TOTP/authenticator records remain stored for rollback but are hidden from normal login and recovery UI. Existing passkeys and backup codes remain valid; users do not re-enroll.

## Recovery completion

Successful passkey or backup-code recovery:

1. Revoke all existing sessions, trusted devices, and active OTP challenges.
2. Create a new authenticated session directly.
3. Trust the recovery browser for 30 days.
4. Persist a short-lived `recovery_email_access_lost` advisory flag.
5. Redirect to `/app/settings?tab=account&recovery=email-access-lost`.

Settings displays a non-blocking ID/EN security banner recommending email and password changes. Dashboard access remains available.

Email change after this recovery verifies ownership through the new email address. It does not require access to the old inbox. The recovery session must be recent and carry the scoped recovery claim; normal sessions cannot bypass old-email safeguards through the same endpoint. On successful email/password change, clear the advisory claim and revoke other sessions/devices again.

Manual admin recovery follows its current approval/cooling controls, then creates the same scoped recovery state and redirect.

An administrator cannot create a cookie-bound session in the user's browser. After approval/execution, manual recovery therefore creates a random, hashed, single-use handoff token with a short expiry and sends/shows only the redeem link through an authorized support channel. User opens the link in their own browser; redemption atomically consumes it, creates the scoped recovery session, trusts that browser, and redirects to Account Settings. Never store or log the raw token.

## Existing MFA policy migration

- Stop `users.two_factor_enabled` from triggering `/two-factor` after password login.
- Stop the protected app layout from forcing `/mfa/setup`.
- Preserve `passkey`, `two_factor`, backup-code, and MFA recovery data.
- Keep `/two-factor` and `/mfa/setup` unavailable from normal login navigation; retain internal rollback compatibility until the new login is proven in production.
- Change current manual recovery execution, which deletes `passkeys` and `twoFactors`, so it preserves both. Recovery revokes sessions/devices/challenges, not recovery credentials. Provide a separate explicit credential-revocation action for a confirmed compromised passkey.
- Settings reframes passkeys and backup codes as recovery methods. TOTP is hidden, not deleted.

No bulk mutation of existing user MFA flags or credential records is required.

## UI

- Login retains email and password fields.
- After valid password on an untrusted device, replace login card with an email OTP screen showing a masked destination, six-digit input, expiry copy, resend countdown, and back-to-login action.
- Never print full email if masking is possible.
- Settings > Account adds Trusted Devices list with last used, expiry, current-device marker, revoke-one, and Logout All Devices.
- Recovery page clearly separates “Forgot password; email available” from “Lost access to email.”
- Recovery options shown: Passkey, Backup Code, Manual Admin Recovery.
- Full EN/ID copy and accessible labels/live errors required.

## Schema

Add additive tables:

### `auth_login_otp_challenges`

- `id uuid primary key default gen_random_uuid()`
- `user_id text not null references users(id) on delete cascade`
- `code_hash text not null`
- `purpose text not null check purpose in ('login')`
- `attempts integer not null default 0 check attempts between 0 and 5`
- `expires_at timestamptz not null`
- `resend_after timestamptz not null`
- `consumed_at timestamptz null`
- `created_at timestamptz not null default now()`
- indexes for user/active expiry cleanup

### `auth_trusted_devices`

- `id uuid primary key default gen_random_uuid()`
- `user_id text not null references users(id) on delete cascade`
- `token_hash text not null unique`
- device/IP/user-agent metadata nullable
- `expires_at`, `created_at`, `last_used_at`, `revoked_at`
- indexes for user active devices and expiry cleanup

Recovery advisory may be encoded as a short-lived signed/scoped session claim or dedicated recovery-session table. Prefer dedicated table if Better Auth session extension cannot prove revocation and one-time semantics cleanly.

### `auth_recovery_handoffs`

- `id uuid primary key default gen_random_uuid()`
- `user_id text not null references users(id) on delete cascade`
- `token_hash text not null unique`
- `method text not null check method in ('passkey','backup_code','manual_admin')`
- `expires_at`, `consumed_at`, `created_at`
- optional `recovery_request_id` for audited manual-admin linkage

All three recovery methods converge on one atomic redemption/session-creation service. Passkey and backup-code verification may redeem immediately in the same browser; manual admin uses the handoff link.

## Failure handling

- Wrong password: existing generic invalid-credentials message.
- OTP delivery unavailable: no session; human message to retry later.
- Wrong/expired/locked OTP: human localized message; never digest/stack.
- Trusted token mismatch: revoke/clear it and require OTP; do not fail password login.
- Recovery credential failure: generic message; rate-limit attempts.
- Mail and auth failures are logged without password, OTP, token, backup code, or session contents.

## Verification

### Unit and contract tests

- Password success cannot access app before OTP unless trusted-device credential is valid.
- OTP hash, expiration, retry cap, cooldown, resend invalidation, and atomic single use.
- Trusted-device owner/hash/expiry/revocation validation and 30-day cookie attributes.
- Logout revokes current device; Logout All revokes every session/device/challenge.
- Password change and manual recovery revoke all auth state.
- Normal login never routes to `/two-factor` or `/mfa/setup`.
- Existing passkey and backup code recovery create scoped recovery sessions and consume backup codes exactly once.
- Google OAuth remains usable and does not mint a password-login trusted-device credential.
- Manual admin approval creates only a hashed single-use handoff; browser redemption creates the session.
- Manual recovery preserves passkey and TOTP rows.
- Email-loss recovery allows new-email verification only with scoped fresh claim.
- TOTP data remains untouched and hidden.

### Integration and browser QA

- Disposable verified account: password → email OTP → dashboard.
- Same browser within 30 days: password → dashboard without OTP.
- Logout: next login requires OTP.
- Logout All: all test browsers require OTP.
- Expired/invalid/resend OTP cases show localized errors.
- Passkey recovery and backup-code recovery redirect to Account Settings with advisory banner.
- Forgot Password email flow remains working.
- DB corroborates session/challenge/device lifecycle without exposing secrets.
- Desktop and 390px mobile layouts pass.

### Production rollout

- Add schema first with idempotent migration and backup.
- Deploy endpoints/UI behind an environment feature flag.
- Verify real email delivery and one disposable end-to-end login before enabling globally.
- Keep rollback route to prior MFA challenge until the new flow passes.
- Re-run health, auth endpoint, DB, proxy, and unrelated-domain checks.

## Out of scope

- Removing stored TOTP secrets or passkeys.
- Passwordless login.
- SMS/WhatsApp OTP.
- Permanent IP/device fingerprint binding.
- Blocking dashboard until email/password changes after recovery.
