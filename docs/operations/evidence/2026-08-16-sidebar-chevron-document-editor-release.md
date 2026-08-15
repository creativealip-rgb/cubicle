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
