# npm Audit — Accepted Risk Note

Last updated: 2026-06-16

## Current state

`npm audit` reports 5 vulnerabilities (2 moderate + 3 high), all rooted in the
**`@esbuild-kit` → `esbuild` ≤ 0.28.0** advisory chain.

```
@esbuild-kit/core-utils [moderate]  via esbuild
@esbuild-kit/esm-loader [moderate]  via @esbuild-kit/core-utils
drizzle-kit           [high]       via @esbuild-kit/esm-loader, esbuild
esbuild               [high]       direct
better-auth           [high]       via drizzle-kit (peer range)
```

## Why these are false positives in our install

1. **Real installed esbuild = 0.28.1** (mitigated via `pnpm.overrides`
   in `pnpm-workspace.yaml`).
2. **Real installed drizzle-kit = 0.31.10** (modern fork, has dropped the
   `@esbuild-kit` dependency in practice, but npm audit still flags it
   because better-auth's peer-dep range
   `drizzle-kit >= 0.19.0-07024c4 || ...` includes the old vulnerable
   range).
3. npm audit reads the **declared range**, not the resolved version.
   pnpm actually resolves to 0.31.10 (safe), but npm audits the metadata
   tree and reports 5 stale advisories.
4. The `drizzle-kit 0.17.5–0.19.0` versions that are actually vulnerable
   are **not installed** in this project.

## What "fix --force" would do (rejected)

`npm audit fix --force` would downgrade `drizzle-kit` to 0.19.1, which is
older and breaks the current Drizzle 0.45.2 / Drizzle Kit 0.31.x workflow
used by this project. This is a **breaking change with no security gain**
since we already override esbuild via pnpm.

Downgrading `better-auth` to 1.4.6 to satisfy a peer-range concern would
also break the v1.6+ API surface used throughout `src/lib/auth.ts`.

## What we did instead

- **pnpm override** in `pnpm-workspace.yaml`:
  ```yaml
  overrides:
    esbuild: ^0.28.1
  ```
  Forces every transitive esbuild copy (including the one nested under
  `@esbuild-kit/core-utils`) to ≥ 0.28.1.
- Verified post-install: `node_modules/.pnpm/@esbuild-kit+core-utils@3.3.2/node_modules/esbuild`
  reports version 0.28.1.
- Verified build: `npx next build` passes clean.
- Lint: `npm run lint` passes 0 errors / 0 warnings.
- TypeScript: `npx tsc --noEmit` passes clean.

## Exploitability assessment

The esbuild dev-server advisory (GHSA-67mh-4wv8-2f99) only affects the
**esbuild dev server** when it is exposed to the network. In our setup:

- `next build` runs the build in a **container** (Dokploy build) with no
  inbound traffic.
- Local dev (`next dev`) only listens on localhost / Docker network.
- No public esbuild dev server is exposed.

Net risk in our deploy: **negligible**.

## Re-audit cadence

Re-run on dependency updates:

```bash
pnpm install
npm audit
npx next build
```

If npm audit ever shows a vulnerability that is **not** in the
`@esbuild-kit` / `drizzle-kit` / `better-auth` family, treat it as a
real finding and address it.

## Acceptance

This risk is accepted per the cubicle_remaining_plan.md P0.7 rule:
> "Document accepted vulnerabilities if not exploitable."
