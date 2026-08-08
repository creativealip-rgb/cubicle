# Invoice Send + Timesheet Attachment — Verification

**Date:** 2026-08-02

**Branch:** `main`

**Environment:** dev.cubiqlo.com (cubicle-dev)

**Test account:** alip.tester.674908@cubiqlo.test

## Test scenario

Verify that "Kirim Invoice" popup correctly attaches a timesheet report link with the date range selected by the user.

## Steps

1. Login to dev.cubiqlo.com with test account
2. Navigate to invoice INV-2026-001 (draft status)
3. Click "Kirim Invoice" button
4. Check "Lampirkan link detail report" checkbox
5. Verify default date range: From=2026-07-01 (start of issue date month), To=2026-07-31 (issue date)
6. Click "Kirim" to send
7. Verify invoice status changes from "Draf" to "Terkirim"
8. Check server logs for email content with timesheet link
9. Open timesheet report link and verify data matches date range

## Results

### ✅ Popup behavior
- "Lampirkan link detail report" checkbox appears in send dialog
- Default dates: `2026-07-01` to `2026-07-31` (matches invoice issue date)
- User can adjust dates before sending

### ✅ Server-side filtering
- `sendInvoiceEmail()` generates signed URL with selected date range
- URL format: `/api/time/export/pdf/va-timesheet?report=full&invoiceToken=...&from=...&to=...&signature=...`
- HMAC signature prevents date manipulation

### ✅ Timesheet report
- Report loads without authentication (public via signed token)
- Date range "Rab, 01 Jul 2026 - Jum, 31 Jul 2026" displayed correctly
- 8 time entries shown (July 1-20, 2026)
- Total: 34:30:00 hours, Rp150.000 billable
- Dashboard section shows donut charts and project/task breakdown

### ✅ Date filtering verification
- Range 2026-07-01 to 2026-07-31 → 8 entries (all July entries)
- Range 2026-07-01 to 2026-07-10 → 6 entries (excludes July 15, 20)
- Filter uses `timeEntries.startTime >= from` AND `startTime <= to + T23:59:59`

### ⚠️ Dev environment notes
- RESEND_API_KEY empty in dev → email logged to console only (not delivered)
- Test data seeded directly via DB (client, project, time entries, invoice)

## Code references

- `send-invoice-button.tsx` — popup UI with date pickers
- `lib/actions/invoices.ts` → `sendInvoiceEmail()` — generates signed report URL
- `lib/invoice-report-options.ts` — URL builder + HMAC signing
- `app/api/time/export/pdf/va-timesheet/route.ts` — timesheet PDF endpoint

## Conclusion

Timesheet attachment feature works correctly. Date range from popup is passed through to the timesheet API, which filters entries by `startTime`. The signed URL prevents tampering. No code changes needed — feature is production-ready.
