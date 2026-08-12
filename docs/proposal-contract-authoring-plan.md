# Proposal & Contract Authoring Implementation Plan

> Execute in bounded batches. Do not deploy production.

**Goal:** decouple draft documents from existing Client records and add block-based authoring with autosave, explicit Save, proposal media, and post-sign optional Client creation.

**Architecture:** Keep current send/sign lifecycle. Add nullable document-to-client links plus recipient snapshots. Store editor blocks as versioned JSON and resolve placeholders through one pure helper. Reuse existing auth, actions, notifications, public token, and signature code.

## Live checklist

- [x] Draft proposal/contract decoupled from required Client row.
- [x] Recipient snapshots stored and used by send paths.
- [x] Nullable `clientId` migration/schema wiring.
- [x] Placeholder helper and block normalization/validation.
- [x] Simplified create flows with editor navigation.
- [x] Shared editor with text/heading/placeholder, autosave, and explicit Save.
- [x] Contract signature block protected server-side.
- [x] Contract public/detail/PDF block rendering with legacy fallback.
- [x] Proposal public block rendering with legacy fallback.
- [x] Proposal acceptance blocks implicit Client creation.
- [x] Post-sign Client action server-side: signed-only, scoped, writable, idempotent.
- [x] Automatic proposal/contract number generation.
- [x] Full list/divider/table block model, editor controls, and safe renderer.
- [x] Autosave revision/stale-write protection.
- [x] Real proposal image/attachment upload, quota, cleanup, reorder, and media rendering.
- [x] Proposal PDF block rendering/path.
- [x] Contract number/date/workspace placeholder parity across preview/public/email/PDF.
- [x] Post-sign detail UI: `Tambah client` and `Nanti`.
- [x] Full test suite, production build, and clean typecheck.
- [ ] Dev deploy and browser acceptance evidence.

**Current status:** PARTIAL. Source implementation and regression gates pass: placeholder parity is shared across detail/public/PDF, stale wiring assertions are aligned, 251 test files / 1,277 tests pass, TypeScript and production build pass, and ESLint has zero errors. Dev deploy and browser acceptance remain open.

## Batch 1 — Domain and schema compatibility

1. Add failing tests for placeholder resolver and block validation.
2. Implement pure `src/lib/document-blocks.ts` and `src/lib/document-placeholders.ts`.
3. Add additive migration for nullable `client_id`, recipient snapshots, proposal/contract numbers, contract date, and block JSON content.
4. Update Drizzle schema and relations; preserve legacy body/line-item reads.
5. Run focused domain tests, migration syntax checks, `tsc`, and diff check.

## Batch 2 — Create workflow

1. Add tests proving proposal/contract draft actions accept manual recipient data without Client ID.
2. Update proposal and contract create actions with validation and generated editable numbers.
3. Simplify `/app/proposals/new` and `/app/contract-templates/new`/contract create UI to requested fields only.
4. Navigate to `/app/proposals/[proposalId]/edit` and `/app/contracts/[contractId]/edit`.
5. Verify existing historical rows and permission guards.

## Batch 3 — Shared block editor

1. Add editor wiring tests for autosave, Save, status feedback, and allowed block types.
2. Build shared client editor shell and text block editing with existing UI primitives.
3. Add heading, paragraph, lists, divider, placeholder, and simple table blocks.
4. Add debounced autosave and explicit Save with stale/error states.
5. Add proposal/contract edit routes and load/save actions.
6. Run focused tests, lint, typecheck, and production build.

## Batch 4 — Proposal media

1. Add image/attachment block validation and upload safety tests.
2. Wire proposal image upload through existing storage/quota helpers.
3. Add image and attachment blocks with delete/reorder behavior.
4. Render media in editor, preview, public proposal, and PDF path where supported.
5. Verify workspace quota and cleanup on failed document save.

## Batch 5 — Contract placeholders and signing

1. Add placeholder resolution tests for editor preview, public contract, email, and PDF.
2. Wire contract number/date/recipient placeholders.
3. Preserve typed signature block through edit/save/preview.
4. Update send snapshot to resolve from document snapshot, not Client lookup.
5. Add regression tests for signed status and atomic signature behavior.

## Batch 6 — Optional Client creation after signing

1. Add action test for owner/member authorization, idempotency, and workspace scope.
2. Add `Tambah client` action using contract recipient snapshot.
3. Add post-sign detail notification with `Tambah client` and `Nanti`.
4. Ensure proposal acceptance never renders this action.
5. Verify duplicate clicks do not create duplicate clients.

## Batch 7 — Regression and browser acceptance

1. Run focused proposal/contract tests, full test suite, lint, typecheck, build, and diff check.
2. Deploy only to dev through approved integration workflow after guardrail checks.
3. Browser-test create-without-client, edit, autosave, explicit Save, preview, send, public acceptance, contract signature, and optional Client creation.
4. Test desktop and 390px mobile layouts, EN/ID, empty/populated/error states.
5. Report source, migration, runtime, and acceptance separately.

## Release gates

- No production deploy.
- Existing historical documents readable.
- No send/sign regression.
- Autosave persistence proven in browser after reload.
- Placeholder output identical across preview/public/email/PDF.
- Contract signature remains atomic.
- Optional Client creation is workspace-scoped and idempotent.
- Proposal media obeys existing upload/quota safety.
- Dev runtime source revision verified before browser QA.
