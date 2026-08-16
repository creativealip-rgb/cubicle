# 2026-08-16 — Sidebar Chevron + Document Editor Polish Production Release

## Scope

- Sidebar collapse/expand as circular chevron at sidebar edge.
- Document editor (proposal/contract) scroll confined to Structure / Canvas / Insert panels.
- Proposal and contract editor back button to detail page.
- Full-bleed edit routes without forcing sidebar collapse.

## Source

- Release branch: `release/cubiqlo-20260816-2`
- Release merge commit: `105593b release: sidebar chevron and document editor polish`
- Dev source proof: `7731145d55383173ca52afbed59fc7feffa35fc8`

## Gates

Passed before production build/deploy:

```bash
git diff --check
npx vitest run src/lib/document-editor-layout-wiring.test.ts src/lib/global-shell-accessibility-wiring.test.ts src/lib/document-autosave-revision-wiring.test.ts
npx tsc --noEmit
npm run build
```

## Migration

None.

## Production deployment result

- New image ID: `sha256:dcd169526fe5b853699ad309a40676964ae06898ff013371d2517409d3f37c30`
- Image tag: `cubiqlo-prod:sha-361afa37968b6e6b53234ff50fe016b8472befba`
- Running container: `cubiqlo-new-app-next`
- Runtime revision proof: `dpl=361afa37968b6e6b53234ff50fe016b8472befba`
- Restart policy: `unless-stopped`
- Health after deploy: `https://app.cubiqlo.com/api/health` returned app/DB ok.
- Smoke after deploy:
  - `https://app.cubiqlo.com/login` HTTP 200
  - `https://cubiqlo.com/` HTTP 200
- Proxy safety: `dokploy-traefik` remains sole public 80/443 owner.

## Rollback

Previous image retained: `sha256:8b00f813684ed3481fcfded27d0155ff7add34b2a27b49bc91927309b9b19e9b` (`cubiqlo-prod:sha-f6aef587c1a49f611516a3929a8320680ef1a711`).
