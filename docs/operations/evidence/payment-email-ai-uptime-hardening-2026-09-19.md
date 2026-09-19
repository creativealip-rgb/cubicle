# Payment, email, AI quota, and uptime hardening — 2026-09-19

## Payment lifecycle

Source/runtime checks:

```text
Checkout owner binding: PASS
Checkout same-origin guard: PASS
Order ID random suffix: PASS
Shared webhook/cron activation helper: PASS
Webhook provider re-fetch: PASS
Amount mismatch guard: PASS
Idempotent completed payment handling: PASS
Pending expiry from provider expired status: PASS
Pakasir sync route auth: PASS
```

Production issue found:

```text
23 old pending Pakasir rows retried forever because provider detail returned 404 or HTML instead of JSON.
Host cron was not scheduling /api/cron/pakasir-sync.
```

Fix deployed:

```text
Stale pending rows older than 24h now close as expired when provider detail is 404/not-found or HTML parse failure.
Pakasir sync script installed at /root/scripts/cubiqlo_pakasir_sync.sh.
Cron installed every 15 minutes.
```

Verification after deploy:

```text
Pakasir sync scanned: 23
Expired: 23
Errored: 0
Old pending >1d: 0
Payment status counts: cancelled=1, completed=14, expired=23
Health: app ok, DB ok
Image: cubiqlo-prod:sha-9722e4df8980eb7a3e53bc27b9d6c8856d534852
```

Cron:

```text
*/15 * * * * /root/scripts/cubiqlo_pakasir_sync.sh >> /var/log/cubiqlo_pakasir_sync.log 2>&1
```

## AI quota

Source checks:

```text
DB-backed AI quota: PASS
Atomic insert/update with setWhere cap guard: PASS
Monthly reset key uses date_trunc('month', current_date)::date: PASS
User-scoped quota migration exists: PASS
Reserve before provider call: PASS
Refund only before provider success: PASS
```

Evidence files:

```text
src/lib/plan.ts
src/app/api/ai/chat/route.ts
src/lib/ai-quota-user-scope-contract.test.ts
```

Live exact cap exhaustion was not run because it would consume production QA allowance.

## Uptime monitor

Installed Hermes watchdog:

```text
Cubiqlo public health watchdog
job_id=2596d6c17321
schedule=*/5 * * * *
```

Behavior:

```text
Silent when https://app.cubiqlo.com/api/health returns status=ok and db=ok.
Alerts this chat when HTTP/network/DB health fails.
```

Manual run status:

```text
ok
```

## Transactional email matrix

Runtime config present:

```text
RESEND_API_KEY=[present]
EMAIL_FROM=[present]
PASSWORD_EMAIL_OTP_LOGIN_ENABLED=[present]
```

Current proof level remains source/runtime-readiness until safe live delivery tests are run against approved recipient addresses.

Known routes/actions found:

```text
Login OTP start/resend/verify routes
Invoice send button/action
Invoice reminder button/action
Email Suite send action
```

Needed next for PASS:

```text
Approved test inbox
Send login OTP
Send recovery/reset
Send invoice
Send invoice reminder
Send proposal
Send contract
Verify delivered/bounce/link/language/reply-to
```

## Production E2E inventory

Existing production specs:

```text
e2e/production-qa-client-project.spec.ts
e2e/production-qa-task.spec.ts
e2e/production-qa-documents.spec.ts
e2e/production-qa-calendar.spec.ts
e2e/production-qa-invoice-payment-report.spec.ts
e2e/production-qa-expense.spec.ts
e2e/production-qa-fixed-invoice.spec.ts
e2e/production-qa-project-billing.spec.ts
e2e/production-qa-retainer-invoice.spec.ts
e2e/production-qa-time.spec.ts
e2e/production-qa-files.spec.ts
e2e/production-qa-portal.spec.ts
e2e/production-qa-reusable-task.spec.ts
```

Mutation E2E not run in this pass. It needs approved QA account/session and cleanup budget because it mutates production data.
