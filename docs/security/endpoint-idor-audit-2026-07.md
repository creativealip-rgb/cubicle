# Endpoint IDOR Audit — 2026-07-25

## Scope

46 Next.js API routes: authenticated exports/downloads/uploads, public portal/share tokens, cron, billing, webhook, settings, AI, notifications, and health endpoints.

## Matrix

- **Unauthenticated authenticated routes:** denied through Better Auth session plus `requireUser`, or delegated server-action guard.
- **Viewer mutations:** denied through `assertWorkspaceWritable`; workspace branding/reply-to restricted further to owner.
- **Foreign workspace IDs:** protected by workspace membership and resource/workspace predicates.
- **Foreign client/project references:** protected by `assertClientInWorkspace` and `assertProjectInWorkspace`.
- **Foreign folder references:** gap found and fixed with `assertFolderInWorkspace` in both upload route and `completeUpload` action.
- **Foreign expense receipt IDs:** gap found and fixed with `assertExpenseInWorkspace` before using supplied `expenseId` in storage path.
- **Portal token malformed/revoked/expired:** denied through token hash, portal enabled, revocation, and expiry checks.
- **Portal token cross-resource:** file, invoice, and request routes bind token client/workspace to target resource.
- **Invoice share replay:** explicit revocation and expiration supported; cancelled invoice denied.
- **Cron missing/wrong secret:** production fails closed; wrong bearer returns unauthorized.
- **Pakasir webhook:** provider transaction is re-fetched; raw body status is never trusted; amount/order/project are checked.
- **Upload content spoofing:** general and portal file uploads use extension allowlist plus magic-byte validation. Expense receipt route now uses receipt-specific extension/MIME/magic-byte agreement.

## Confirmed fixes

1. Added folder ownership assertion for authenticated file uploads.
2. Added expense ownership assertion for receipt uploads using an existing expense ID.
3. Added receipt magic-byte and MIME/extension agreement validation.
4. Added static boundary regression and behavioral receipt validation tests.

## Verification

- Targeted RED: `tenant-boundary-wiring.test.ts` failed on missing folder/receipt guards.
- Targeted GREEN: 19/19 tests passed.
- Full Vitest: 138/138 passed.
- ESLint: passed.
- Next.js production build: passed.

## Residual risks

- Static wiring tests prove critical predicates remain wired, while browser E2E covers representative tenant/viewer flows; not every one of 46 routes has an isolated HTTP integration test.
- Public workspace logo intentionally exposes branding by UUID; no private business data returned.
- Presigned expense upload action remains legacy code and trusts client MIME because R2 receives bytes directly. Current UI uses same-origin `/api/expenses/receipt`; remove or migrate presigned path before exposing it to new callers.
- Public token URLs remain bearer credentials. Referrer policy, log redaction, rotation, expiry, and revocation remain operational requirements.
