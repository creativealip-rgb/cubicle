# Invoice Create and Full Editor Design

## Goal

Reduce invoice creation to two fields, then make the existing invoice detail route the single complete invoice editor.

## Create flow

Global `New Invoice` dialog contains only:

- Invoice Number: prefilled from workspace sequence, editable, workspace-unique.
- Client: required searchable selector.

Submitting creates an empty Draft with workspace defaults: issue date today, default currency, default terms, zero totals, and no line items. It redirects to `/app/invoices/[invoiceId]` and focuses the first incomplete authoring field. Client/project-scoped create entry points may keep their scope preselected but must use the same lightweight draft creation path.

## Full editor

`/app/invoices/[invoiceId]` becomes the only invoice editing surface. Remove the separate read-only summary followed by a secondary Edit Invoice card. The editor supports:

- invoice number;
- client;
- project;
- issue and due dates;
- currency;
- line-item description, quantity, and rate;
- add/remove line items and supported project/time sources;
- nominal discount;
- tax/admin charge;
- notes and terms;
- workflow status actions.

Desktop uses a wide editor and sticky right summary. Mobile uses one column with a sticky Save Changes bar. Preview, Send, Reminder, Void, Delete, and Share remain available without becoming duplicate editors.

## Mutability

All business fields are editable for every invoice status, including Paid. Server authorization and workspace/client/project validation remain mandatory. Client changes clear or reject incompatible projects and source links. Invoice number remains workspace-unique.

## Payment semantics

Payment records remain source of truth for collected money.

- `Mark as Paid` records one automatic payment equal to current remaining amount.
- Automatic payment defaults: paid date today, method `Manual`, explicit automatic marker.
- Partial payment remains available through a compact `Record Partial Payment` action.
- `Partial` and `Paid` are computed from payment totals, not freely selectable statuses.
- Editing invoice totals recomputes payment status.
- Save is rejected when recorded payments would exceed the new invoice total.
- Moving away from Paid may reverse only the payment created automatically by Mark as Paid. Manual payments are never silently removed.

Workflow states remain Draft, Sent, Viewed, Overdue, Cancelled, and Archived. Payment state is displayed separately as Unpaid, Partial, or Paid.

## Persistence and integrity

Use a transaction and row lock for full financial saves and Mark as Paid. Recalculate subtotal, tax/charge, discount, total, amount paid, and payment status server-side. Audit-log financial edits, client/project changes, status changes, automatic payment creation, and automatic payment reversal. Preserve tenant scope and existing source/time-entry integrity.

## Error handling

Show concise bilingual errors for duplicate number, invalid client/project relation, stale invoice, overpayment, missing required fields, and source-backed items that cannot safely move. Never partially save invoice metadata while line-item save fails.

## Verification

- Unit tests for total/payment-state reconciliation and overpayment rejection.
- Action tests for tenant scope, uniqueness, client/project validation, atomic full-save, Mark as Paid, and payment reversal rules.
- Wiring tests for two-field create dialog and one editor surface.
- Full tests, lint, TypeScript, and production build.
- Browser QA: create draft, redirect, edit/reload, line-item CRUD, Paid auto-payment, partial payment, overpayment rejection, desktop/mobile, ID/EN.

## Out of scope

No new `/edit` route, no deletion of payment history, no implicit payment from DP/milestone invoice creation, and no recurrence changes.
