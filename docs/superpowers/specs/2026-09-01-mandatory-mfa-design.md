# Mandatory MFA Design

## Goal

Require every Cubiqlo user to enroll and use multifactor authentication because every user owns a workspace by default. Preserve secure account recovery without making email the only recovery channel.

## Current baseline

- Next.js 16, PostgreSQL, Better Auth `1.6.22`.
- Email/password login and Google login exist.
- Email verification is required.
- Password reset uses a one-hour email link.
- Session idle/absolute expiry and banned-user session rejection exist.
- No MFA, TOTP, passkey, backup-code, or MFA-recovery wiring exists.
- Better Auth `1.6.22` already exports `twoFactor` and `twoFactorClient` with TOTP, OTP, backup codes, and trusted-device support.
- `@better-auth/passkey@1.6.22` is compatible but not installed.

## Authentication policy

Every account must enroll at least one phishing-resistant or possession factor:

1. Passkey/WebAuthn is preferred.
2. TOTP authenticator is the universal alternative.
3. Ten single-use backup codes are generated during enrollment.
4. Email OTP is not an enrolled primary factor and cannot independently disable MFA, replace email, or complete high-risk recovery.

MFA applies to password and Google-authenticated users. A successful first factor without completed MFA must not create a fully privileged application session.

## Enrollment

### New users

1. Sign up or sign in with Google.
2. Verify email where applicable.
3. Enter mandatory `/mfa/setup` flow.
4. Register passkey or enroll TOTP and verify one valid code.
5. Generate backup codes; store only hashes server-side.
6. Require explicit confirmation that codes were saved.
7. Revoke pre-enrollment sessions and issue a normal authenticated session.

Until complete, access is limited to MFA setup, logout, and recovery help.

### Existing users

Existing accounts receive a 14-day grace period from production rollout. During grace period, show a persistent deadline banner. After deadline, redirect all protected routes to `/mfa/setup`. Admin surfaces show enrollment state and deadline but never factor secrets or backup codes.

## Login

1. Verify password or OAuth identity.
2. If MFA enrollment is required but incomplete, redirect to setup.
3. If enrolled, challenge with available passkey or TOTP.
4. Backup code can replace the second factor once; consume it atomically.
5. Trusted-device opt-in lasts at most 30 days and is unavailable for high-risk operations.
6. Issue full session only after successful challenge.

Rate limits apply by normalized account and IP. TOTP/backup-code verification permits five failed attempts before exponential backoff. Responses must not disclose whether an email/account exists.

## Step-up authentication

Require a fresh passkey/TOTP challenge for:

- changing email or password;
- adding/removing/resetting MFA factors;
- regenerating recovery codes;
- changing workspace owner/admin roles;
- billing or payout-sensitive changes;
- export of workspace data;
- deleting account or workspace.

Email OTP and trusted-device state do not satisfy step-up for these operations.

## Recovery

Self-service order:

1. another registered passkey;
2. TOTP authenticator;
3. unused backup code;
4. authenticated active-session recovery, still requiring a remaining factor before sensitive changes.

If all factors and email access are lost, use admin-assisted recovery:

- collect a new reachable email and workspace ownership evidence;
- apply a 72-hour cooling period;
- notify old email and all active sessions;
- require two-admin approval for manual reset;
- record immutable audit events and evidence metadata, not uploaded identity secrets;
- revoke all sessions and trusted devices;
- remove old factors only after approval;
- reset password/email through separately expiring signed actions;
- force fresh MFA enrollment before workspace access.

No security questions, support-provided static bypass codes, direct DB toggles, instant MFA resets, or admin visibility into secrets.

## Data and Better Auth integration

- Configure Better Auth `twoFactor()` and `twoFactorClient()` using TOTP and backup codes.
- Install matching `@better-auth/passkey@1.6.22`; configure WebAuthn RP ID `cubiqlo.com` and production origin `https://app.cubiqlo.com`.
- Add official Better Auth 2FA/passkey tables and user enrollment fields through a reviewed PostgreSQL migration.
- Add application-owned MFA policy state: rollout deadline, enrollment completion, recovery state, trusted-device metadata, and audit events only where Better Auth does not own equivalent data.
- Encrypt TOTP secrets at rest with an application encryption key separate from `BETTER_AUTH_SECRET` if Better Auth storage does not already provide equivalent encryption.
- Hash backup codes; consume with a transaction/row lock.
- Never log OTP, TOTP URI/secret, WebAuthn challenge, recovery code, session token, or reset token.

## UI surfaces

- `/mfa/setup`: passkey-first choice, TOTP QR/manual key, verification, backup-code download/print, save confirmation.
- `/two-factor`: login challenge with passkey first, TOTP, then backup-code fallback.
- Settings → Account/Security: factor inventory, add factor, rename/remove passkey, regenerate codes, trusted devices, session revoke.
- Recovery flow: self-service factor options and manual-recovery request/status.
- Admin: enrollment status, recovery queue, dual approval, audit timeline; no secret access.

All forms support desktop/mobile, keyboard navigation, screen readers, paste/autofill (`autocomplete="one-time-code"`), and generic failure copy.

## Rollout phases

1. Schema/plugin integration behind disabled feature flag; test migrations and rollback.
2. Enrollment and challenge flows in development; security and browser tests.
3. Enable optional enrollment in production for internal accounts; verify mail, WebAuthn origins, recovery codes, logs.
4. Start 14-day grace period for all users.
5. Enforce setup redirect after deadline.
6. Enable step-up requirements and manual recovery queue.
7. Monitor lockouts, failed challenges, recovery volume, and suspicious attempts without logging secrets.

Rollback may disable enforcement but must not delete enrolled factors or downgrade already protected accounts. Database migrations remain additive.

## Acceptance criteria

- New and post-deadline existing users cannot access protected routes without completed MFA enrollment.
- Password and Google login both require second-factor challenge when enrolled.
- Passkey and TOTP each work independently.
- Backup codes are shown once, stored hashed, consumed once, and regenerate by invalidating the old set.
- Email compromise alone cannot disable MFA or change account email.
- Recovery without email works through passkey, TOTP, or backup code.
- Manual recovery enforces delay, dual approval, notification, session revocation, audit, and re-enrollment.
- Sensitive actions require fresh phishing-resistant/TOTP step-up.
- Rate limits, generic errors, tenant boundaries, CSRF/origin validation, and secret-redaction tests pass.
- Production browser QA covers desktop/mobile setup, login, recovery, trusted device, factor removal, and session revocation.

## Sources

- Better Auth 2FA: https://www.better-auth.com/docs/plugins/2fa
- Better Auth Passkey: https://www.better-auth.com/docs/plugins/passkey
- NIST SP 800-63B-4: https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP MFA Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
