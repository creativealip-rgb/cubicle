# MFA Guided Wizard Design

## Goal

Replace generic MFA setup card with clear, premium two-step wizard. Preserve existing Better Auth passkey, TOTP, recovery-code, enrollment-completion, and redirect behavior.

## Layout

Centered responsive shell, maximum width 520px. Mobile uses viewport gutters, full-width actions, and zero horizontal overflow.

Header uses restrained Cubiqlo purple gradient and contains:

- `Account security` eyebrow.
- Current step title.
- `Step 1 of 2` or `Step 2 of 2` label.
- Two-segment progress indicator.

Body uses white surface, subtle border/shadow, 20–24px radius, and clear spacing. No decorative stock imagery or extra cards.

## Step 1: Choose method

Show two explicit methods:

1. **Set up a passkey** — primary action. Supporting copy: use Face ID, fingerprint, or device PIN. Mark `Recommended`.
2. **Use authenticator app** — secondary action. Supporting copy: enter a six-digit code from an authenticator app.

Selecting passkey starts existing WebAuthn registration. Selecting authenticator advances to password confirmation.

Passkey browser cancellation or registration errors stay on step 1 and render an accessible inline alert near method actions.

## Step 2: Passkey

While WebAuthn runs, show pending state and disable duplicate submissions. Successful registration calls the owner-scoped enrollment completion action, which requires an authenticated user and a persisted passkey row before enabling MFA.

Completion screen replaces wizard controls and shows:

- `Two-step verification is ready`.
- `Your account is protected.`
- Primary `Continue to dashboard` button.

## Step 2: Authenticator

Sequence:

1. Confirm current password.
2. Display authenticator setup details.
3. Keep the existing URI as a copyable manual setup value. Do not add a QR-code dependency in this polish pass; QR rendering can be a later enhancement if users request it.
4. Accept one six-digit code.
5. Verify TOTP.
6. Display recovery codes after successful verification.

Recovery codes provide copy and download controls. User must check `I saved my recovery codes` before `Continue to dashboard` becomes enabled.

Recovery codes remain visible only in completion state and are never written to logs or browser storage.

## Navigation and guards

- Existing authenticated-user requirement remains.
- User with active MFA visiting `/mfa/setup` redirects to `/app/dashboard`.
- Successful passkey or authenticator setup ends at a visible completion state; no automatic redirect hides recovery codes.
- Dashboard navigation occurs only from explicit CTA.

## Accessibility

- One visible `h1` per state.
- Progress has textual step label, not color alone.
- Alerts use `role="alert"`; completion message uses `role="status"`.
- Buttons retain keyboard focus rings and minimum 44px touch height.
- Inputs have persistent labels and correct autocomplete/input modes.
- Color contrast meets WCAG AA.
- Reduced-motion users receive no required animation.

## Responsive behavior

- 390×844 acceptance viewport has zero document overflow.
- Header and body remain one card on desktop and mobile.
- Method actions stack vertically.
- Recovery-code grid collapses safely on narrow screens.
- Long URI is contained and copyable without widening page.

## Tests and acceptance

Automated source/unit tests cover:

- method selection state;
- passkey completion only after persisted passkey;
- recovery-code confirmation gate;
- active-MFA setup-route redirect;
- accessible progress/status/alert semantics.

Browser QA covers passkey and authenticator branches at 390×844:

- screenshots for method selection, step 2, recovery codes, completion, and dashboard;
- virtual WebAuthn credential proof;
- DB proof for passkey/TOTP and `two_factor_enabled`;
- reload and `/mfa/setup` re-entry behavior;
- no console/server errors;
- zero horizontal overflow.

## Scope limits

No auth schema changes, new authentication methods, account-settings redesign, or unrelated onboarding changes. Reuse installed packages and existing Cubiqlo components. Add no dependency unless QR rendering cannot use an already-installed package or native browser capability.
