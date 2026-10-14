# Landing, Brand, and Runtime Release Evidence — 2026-10-14

## Release

- Feature source: `a142f7c8766a768a5ad9a489f2a47dfd58267bf5`
- Production image: `cubicle:sha-a142f7c8766a768a5ad9a489f2a47dfd58267bf5`
- Canonical URLs: `https://cubiqlo.com`, `https://app.cubiqlo.com`
- Migration: none

## Scope

### Brand identity

- Replaced horizontal and square Cubiqlo assets from the supplied `cubiqlo.com` identity.
- Covered header/auth/sidebar aliases, favicon variants, PWA icons, Apple touch icon, SVG compatibility assets, and Open Graph image.
- Central `CubiqloLogoHeader` and `CubiqloLogoIcon` now use the new assets.

### Landing proof and footer

- Recaptured Dashboard and Tasks screenshots after a visible production login.
- Recaptured Client Portal after resolving a valid portal token, passing the password gate, and confirming portal content.
- Replaced `public/screenshots/dashboard.png`, `tasks.png`, and `client-portal.png`.
- Rebuilt footer into a responsive brand/navigation row plus separate legal/tagline row.

### Runtime and behavior

- Production AI model set to `ds/deepseek-v4-flash` through the existing 9Router OpenAI-compatible endpoint.
- Blue-green deploy script sources canonical `AI_MODEL` and restores required `PORTAL_PASSWORD_ENCRYPTION_KEY` when missing from the active container environment.
- Contract editor receives real status, displays final state, and blocks settings saves for signed/declined records.
- Personal Site selected-text links persist and render across Hero, legacy headings, list items, and public section fields.

## Verification

- TypeScript: passed.
- Full release build: passed.
- Production deployment: `DEPLOY_OK`.
- Health endpoint: `status=ok`, `db=ok`.
- Landing browser verification:
  - Dashboard screenshot loaded at `835×528`.
  - Tasks screenshot loaded at `835×528`.
  - Client Portal screenshot loaded at `835×528`.
  - Footer rendered Workflow, Pricing, Terms, Privacy, copyright, and tagline.
- Proxy guardrail: deployment used existing Dokploy Traefik route; no project proxy bound public 80/443.

## Held next plan

Prompt Studio consistency improvements remain planning-only:

- `.hermes/plans/2026-10-14_004203-prompt-studio-consistency.md`
- No recipe/preset/quality-gate implementation started.
