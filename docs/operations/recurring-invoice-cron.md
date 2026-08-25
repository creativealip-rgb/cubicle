# Recurring invoice cron

Endpoint: `GET /api/cron/recurring-invoices`

Authentication:

```text
Authorization: Bearer $CRON_SECRET
```

Recommended schedule: daily after local midnight. Rules calculate due dates using each workspace timezone and generate draft invoices transactionally.

Example host cron:

```cron
10 0 * * * curl --fail --silent --show-error -H "Authorization: Bearer $CRON_SECRET" https://cubiqlo.com/api/cron/recurring-invoices
```

Required release steps:

1. Apply `drizzle/0081_recurring_invoice_rules.sql`.
2. Confirm `CRON_SECRET` exists in application and scheduler environments.
3. Register scheduler request.
4. Call endpoint once and confirm JSON `{ "ok": true, ... }`.
5. Create a due QA rule, run endpoint twice, and verify only one invoice exists for that rule occurrence.

Route presence does not mean scheduler registration. Production scheduler registration remains an operational release gate.
