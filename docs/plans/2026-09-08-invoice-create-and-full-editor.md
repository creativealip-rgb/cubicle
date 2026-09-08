# Invoice Create and Full Editor Implementation Plan

> **For Hermes:** Implement directly in main agent because Alip said `Gas`. Use strict TDD and preserve production billing integrity.

**Goal:** Create empty invoice drafts from a two-field dialog, then edit every invoice business field through one atomic editor on the existing detail route.

**Architecture:** Add a narrow draft action for creation, one transactional full-save action for metadata and line items, and payment reconciliation helpers. Keep `/app/invoices/[invoiceId]` as the sole detail/editor route. Reuse existing selectors, currency, item, preview, payment, and share components where they remain valid.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Drizzle ORM, PostgreSQL, Zod, Vitest, Playwright.

---

### Task 1: Payment reconciliation policy

**Files:**
- Create: `src/lib/invoice-payment-reconciliation.ts`
- Create: `src/lib/invoice-payment-reconciliation.test.ts`

1. Write failing tests for Unpaid/Partial/Paid resolution and overpayment rejection.
2. Run `npx vitest run src/lib/invoice-payment-reconciliation.test.ts`; expect RED.
3. Implement pure helper with decimal-safe numeric comparisons at project precision.
4. Rerun; expect PASS.

### Task 2: Lightweight empty-draft creation

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Modify: `src/components/invoices/invoice-create-dialog.tsx`
- Modify: client/project scoped dialogs only where needed for shared behavior.
- Test: `src/lib/invoice-simple-create-wiring.test.ts`

1. Write RED tests requiring only `invoiceNumber` and `clientId` in global create UI.
2. Add `createEmptyInvoiceDraft` with auth, workspace scope, client validation, unique number generation/check, workspace defaults, and empty items.
3. Redirect returned ID to existing detail route.
4. Keep project/client scoped entry points compatible; no regression to source-backed generation.
5. Run focused tests.

### Task 3: Atomic full-save action

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Create: `src/lib/invoice-full-save.test.ts`

1. Write RED tests/wiring contracts for transaction, invoice row lock, client/project validation, number uniqueness, line-item replacement/update, server totals, overpayment rejection, status reconciliation, and activity logs.
2. Add Zod input for all editable fields and items.
3. Implement `saveInvoiceEditor` as one transaction; reject invalid source reassignment and payment overage.
4. Preserve existing time-entry/source links or reject unsafe edits explicitly.
5. Run focused tests and TypeScript.

### Task 4: Mark as Paid semantics

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Modify/Create payment action UI under `src/app/(app)/app/invoices/[invoiceId]/`
- Test: `src/lib/invoice-mark-paid.test.ts`

1. Write RED tests for automatic remaining payment, method `Manual`, today date, idempotency, row lock, and audit log.
2. Add explicit automatic marker using existing payment metadata/notes if schema supports it; otherwise add minimal additive migration plus schema field.
3. Implement automatic-payment reversal only for marked automatic records; never silently delete manual records.
4. Keep partial payment action compact.
5. Run focused tests; if migration needed, apply twice to disposable DB and inspect metadata.

### Task 5: Single full editor UI

**Files:**
- Modify: `src/app/(app)/app/invoices/[invoiceId]/page.tsx`
- Modify: `src/components/invoices/invoice-meta-form.tsx` or replace with one focused editor component.
- Modify: invoice item editor components as required.
- Test: `src/lib/invoice-full-editor-wiring.test.ts`

1. Write RED wiring tests proving one editor, no secondary Edit Invoice card, editable client/project/number/items, sticky Save, and compact payment summary.
2. Build desktop two-column editor with sticky right summary.
3. Build one-column mobile layout with sticky bottom save action.
4. Keep Preview/Send/Reminder/Void/Delete/Share actions.
5. Remove status controls that directly set Paid/Partial; expose Mark as Paid action.
6. Run focused tests, ESLint, TypeScript.

### Task 6: Regression and browser acceptance

**Files:**
- Update affected source/wiring tests only where old architecture is intentionally superseded.

1. Run `npm test -- --maxWorkers=2`.
2. Run `npm run lint`.
3. Run `./node_modules/.bin/tsc --noEmit --incremental false`.
4. Run `npm run build`.
5. Browser QA with persistent authenticated profile:
   - two-field create and redirect;
   - empty draft editor;
   - save/reload all fields;
   - item add/edit/delete;
   - Mark as Paid auto-payment;
   - partial payment;
   - edit Paid total and reconcile;
   - overpayment rejection;
   - ID/EN;
   - desktop/mobile overflow.
6. Clean all QA fixtures created during browser mutation tests.
7. Commit and push only after all gates pass. Production deploy requires explicit approval after implementation report.
