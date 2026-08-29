# Personal Site New-User Publish — Production Evidence

**Recorded:** 2026-08-29  
**Status:** PASS

## Scope

- New-user Personal Site defaults publish without mandatory CTA.
- CTA is fully optional: partial or empty CTA data does not block save/publish.
- Public renderer emits a CTA only when label and safe destination are both present.
- Publish dialog exposes exact public URL with Copy link and Open site actions.
- Preview and public URLs remain distinct.

## Source changes

| Commit | Change |
|---|---|
| `dfe3aa8` | Removed invalid default `Contact me` label without destination; new-user default is publishable. |
| `5ed4265` | Added public URL, Copy link, and Open site to publish dialog. |
| `0f6f09c` | Made CTA validation easier to diagnose; superseded by fully optional policy below. |
| `278f7de` | Removed CTA pairing/contact requirements from readiness and Server Action validation; removed confusing CTA controls from publish dialog. |

## Production proof

- Dedicated fixture: `qa-personalsite-20260828181200@example.com`.
- Workspace slug/effective Free slug: `ws-wk19fhr7`.
- DB: Personal Site exists with `published=true`.
- Public URL: `https://cubiqlo.com/site/ws-wk19fhr7` returned HTTP 200 and rendered `My Studio` content.
- Existing paid workspace effective custom URL: `https://cubiqlo.com/site/alip` returned HTTP 200; workspace fallback `/site/ws-ycPGDVqP` correctly returned 404 because paid custom slug `alip` is authoritative.
- Copy-link browser proof matched displayed URL and clipboard value exactly.
- Responsive proof at 390×844: Copy link and Open site visible; horizontal overflow `0px`.

## Verification

- Focused final suite: 36/36 tests passed.
- TypeScript: PASS.
- ESLint: PASS.
- `git diff --check`: PASS.
- Production build: PASS.
- Running image: `cubiqlo-prod:sha-278f7deb9819f5fd5ffc32144ead148a2716329a`.
- Health: `{ "status": "ok", "db": "ok" }`.
- Proxy safety: `dokploy-traefik` remains sole public reverse proxy on ports 80/443.

## CTA behavior contract

CTA fields are optional input. Incomplete CTA data is stored safely but does not render a public button. A public CTA renders only when both label and destination exist and destination passes safe-link validation. No CTA or contact method is required to publish.
