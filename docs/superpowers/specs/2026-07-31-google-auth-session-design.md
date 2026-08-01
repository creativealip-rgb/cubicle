# Google Auth and Session Lifetime Design

## Goal

Add Google sign-up/sign-in to Cubiqlo while preserving existing email/password accounts and Google Calendar integration. Sessions expire after seven days without activity and always expire after 30 days.

## Authentication flow

- Configure Better Auth Google provider from `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables.
- OAuth callback: `https://app.cubiqlo.com/api/auth/callback/google`.
- Add `Lanjutkan dengan Google` actions to Login and Signup.
- New Google users enter existing onboarding flow.
- Google identities with a verified email matching an existing Cubiqlo user link to that user instead of creating a duplicate.
- Existing Google Calendar callback and permissions remain separate.

## Session policy

- Sliding idle lifetime: seven days.
- Active authenticated requests refresh the session according to Better Auth `updateAge`.
- Absolute lifetime: 30 days from session creation; sessions beyond this limit are rejected and deleted.
- Email/password and Google sessions follow the same policy.
- Invalid or expired sessions return users to Login.

## Security

- OAuth secrets stay in runtime environment only; no secret enters Git.
- OAuth account linking trusts only provider-verified Google email.
- Existing email/password credentials remain valid after linking.
- Production uses database `cubicle` on `cubiqlo-new-pg`; development uses `cubicle_dev`.

## Verification

- Build and focused auth tests pass.
- Google authorization redirects to Google with correct callback.
- Existing user linking does not create duplicate users/workspaces.
- New user reaches onboarding.
- Session idle refresh, seven-day idle expiry, and 30-day absolute expiry are exercised.
- Production health, login route, callback route, container logs, and proxy ownership are checked after deploy.
