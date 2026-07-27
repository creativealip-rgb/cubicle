# Client Portal Slug and Password Design

## Goal

Make Portal the default first tab on client detail, expose a stable slug URL at all times, and require a client-managed password before public portal content is rendered.

## Admin experience

- Tab order: Portal, Proyek, Invoice, Calendar, Catatan.
- Missing or invalid `?tab=` defaults to `portal`.
- Portal URL is always visible as `/client-portal/{slug}` even before activation.
- Admin actions: copy link, open link, set/change password, activate/regenerate access, revoke.
- Internal token is never rendered in URL or UI.
- Password cannot be recovered; owner can only replace it.

## Public access

- Slug route resolves an enabled client but does not render protected portal data before authorization.
- Visitor submits password through a server endpoint.
- Correct password creates signed, HttpOnly, Secure, SameSite=Lax portal session cookie scoped to client portal routes.
- Wrong password, unknown slug, disabled portal, and missing password configuration return one generic failure response.
- Password attempts use existing fail-closed distributed rate limiter.
- Session has bounded lifetime and is bound to client id plus current password/session version so password change or revocation invalidates old sessions.
- Legacy token route remains available temporarily. Once a password exists, legacy route also requires portal session and never bypasses password.

## Storage and security

- `clients.portal_password_hash`: one-way password hash produced by Better Auth password helper.
- `clients.portal_session_version`: random/version value rotated on password update, activation/regeneration, and revoke.
- No plaintext password storage or logging.
- Slug remains routing metadata, not authentication.

## Migration

- Add nullable password hash and non-null session version.
- Existing active portals remain inaccessible through slug until owner sets a password.
- No production migration or deployment without explicit approval.

## Verification

- Source/unit tests for default tab, ordering, always-visible slug link, hash-only storage, and cookie security.
- Dev migration and DB audit.
- Browser E2E: slug opens password gate; wrong password rejected; correct password opens portal; refresh stays authorized; password reset invalidates old session; revoke blocks access.
- Typecheck, lint, tests, build, container health, and production-isolation checks.
