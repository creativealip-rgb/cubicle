# Dashboard Approvals and First-Workspace Setup — Production Evidence

**Recorded:** 2026-08-29  
**Status:** PASS

## Dashboard approvals

- Approval card aggregates active-workspace client approvals only:
  - client-visible tasks in `review`;
  - proposals in `sent` or `viewed`;
  - contracts in `sent` or `viewed`.
- Timesheets and time entries remain excluded.
- Clicking the card opens a popover; it does not navigate to a new aggregate page.
- Empty state reads `No pending approvals`; non-zero categories link to their existing filtered lists.
- Production mobile QA at 390×844 showed the popover and `0px` horizontal overflow.

## First-workspace setup

- A user without workspace membership stays on `/app/dashboard`.
- Dashboard shell remains visible behind a locked modal.
- Modal cannot be dismissed by close button, Escape, or backdrop click.
- Three modal steps restore the previous onboarding sequence:
  1. Workspace — required 2–80 character name.
  2. Team — optional and skippable; actual invitations remain available through Settings after workspace creation.
  3. Ready — confirms the chosen name and creates the workspace on `Enter dashboard`.
- Workspace creation also creates owner membership and seeds default proposal/contract templates.
- Layout and dashboard use non-mutating workspace lookup, preventing workspace creation before final submit.

## Verification

- Focused Vitest: 5/5 passed for approval popover and first-workspace modal wiring.
- TypeScript: passed.
- ESLint: passed.
- Local production build: passed.
- Docker production build: passed.
- Production health: app and DB `ok`.
- Browser QA:
  - URL remained `/app/dashboard`;
  - Workspace, Team, and Ready steps rendered;
  - close button count `0`;
  - mobile horizontal overflow `0px`.
- Dedicated QA users were returned to `0` memberships and `0` active sessions after testing.

## Release

- Approval popover: `fce8eb8`.
- First-workspace modal: `488ffa2`.
- Three-step modal: `23f17d7`.
- Running image: `cubiqlo-prod:sha-23f17d73a739a97649d313da2c74b061648e1146`.
- Container: `cubiqlo-new-app-next` on `dokploy-network`; `dokploy-traefik` remains sole public 80/443 proxy.
