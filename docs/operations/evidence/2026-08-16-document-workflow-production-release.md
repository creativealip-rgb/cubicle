# 2026-08-16 — Document Workflow Production Release Evidence

## Scope

- Billing-aware Time selector gating.
- Timer UX: no navbar timer control; Time page Start Timer remains; browser tab active timer indicator restored.
- Proposal/Contract send dialog editable custom message with link placeholders.
- Proposal/Contract table action alignment.
- Proposal/Contract detail layout parity with approved production-like design.
- Timesheet work-date fallback uses `Asia/Jakarta`.

## Source

- Release branch: `release/cubiqlo-20260816`
- Release merge commit: `9ca9f7e release: cubiqlo document workflow polish`
- Dev source proof: `7eaddbbf75cc137140631a1a2e34b6a5dec0c3f6`

## Gates

Passed before production build/deploy:

```bash
git diff --check
npx vitest run src/lib/send-document-message-wiring.test.ts src/lib/time-active-timer-actions-wiring.test.ts src/lib/time-report-date-wiring.test.ts src/lib/billing-aware-time-selector-gating.test.ts
npx tsc --noEmit
npm run build
```

## Production baseline before deploy

- Container: `cubiqlo-new-app-next`
- Previous image ID: `sha256:533c4509dc25aca94346f360acfaba2f5abc4a2f7f80bea69e2b6ac5303b9af6`
- Previous image tag: `cubiqlo-prod:sha-1f98426`
- Started: `2026-08-15T11:32:32.214444368Z`
- Health: `https://app.cubiqlo.com/api/health` returned app/DB ok.
- Smoke:
  - `https://app.cubiqlo.com/login` HTTP 200
  - `https://cubiqlo.com/` HTTP 200

## Migration

None.
