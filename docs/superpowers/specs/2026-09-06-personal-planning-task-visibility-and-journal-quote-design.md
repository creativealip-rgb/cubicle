# Personal Planning, Task Visibility, Human Errors, and Daily Journal Quote

Date: 2026-09-06
Status: Reviewed design — awaiting final approval

## Scope

Deliver four connected Cubiqlo UX changes without altering unrelated billing, portal, or productivity behavior:

1. New project tasks default to client-visible.
2. Client/project business-rule failures use actionable human messages instead of opaque Server Action digests.
3. Personal expense planning and personal report move from Finance into a new Personal > Planning page.
4. Journal shows one AI-assisted Quote of the Day above Today's Reflection Prompt.

## 1. Task visibility defaults

### Behavior

All newly created project tasks default to `clientVisible=true`. Users retain an explicit checkbox to turn visibility off for internal tasks.

Apply the default at every confirmed task creation boundary:

- manual task create form (already defaults on; preserve it);
- direct `createTask` server action when caller omits `clientVisible`;
- task-template import insert;
- AI task confirmation/execution insert;
- Personal Notes → Task conversion.

Audit all `insert(tasks)` call sites before implementation; no creation path may rely only on the PostgreSQL column default, which remains conservative for old callers. Existing tasks remain unchanged. No migration flips old private tasks to public.

### Safety

The server action is authoritative. UI defaults improve intent, but omitted values resolve to `true` at every creation boundary. Explicit `false` remains respected. Portal reads continue requiring both project and task visibility, so an explicitly internal task stays private.

## 2. Human-readable project/client errors

### Project editing

Billing-model transition protection remains unchanged: a project with time entries or invoices cannot change billing model.

The edit UI receives a `billingModelLocked` state derived server-side from related time/invoice existence. When locked:

- Billing Model control is disabled.
- Existing model remains visible.
- Helper text explains why it is locked.
- Name, description, dates, visibility, status, currency, and compatible financial values remain editable.
- Submit does not send a false billing-model transition.

If a stale browser still submits an invalid transition, the server action returns a typed result rather than throwing an opaque digest:

```text
ID: Model tagihan dikunci karena proyek ini sudah memiliki catatan waktu atau invoice. Pengaturan proyek lainnya tetap bisa diubah.
EN: Billing model is locked because this project already has time entries or invoices. Other project settings can still be edited.
```

### Client deletion

Current permanent deletion is a deliberate cascade across tenant-owned records; it does not implement a generic “cannot delete because invoice exists” rule. Preserve cascade semantics unless a specific protected lifecycle state blocks deletion. Convert expected failures from project/client delete and edit flows into typed results with operation-specific messages rather than inventing a blanket dependency prohibition.

Examples:

```text
ID: Client belum bisa dihapus karena masih memiliki data yang dilindungi. Selesaikan atau batalkan data tersebut, lalu coba lagi.
EN: This client cannot be deleted while it has protected records. Complete or cancel those records, then try again.
```

```text
ID: Model tagihan tidak bisa diubah karena proyek sudah memiliki catatan waktu atau invoice. Perubahan lain tetap dapat disimpan.
EN: Billing model cannot be changed because this project already has time entries or invoices. Other changes can still be saved.
```

The UI must distinguish blocked deletion, stale input, authorization failure, and unexpected failure. Unexpected failures retain a generic localized message and server logging; raw stack traces, digests, SQL/schema names, and database terms never appear in UI. `PermanentDeleteButton` must consume typed results and show returned human copy.

## 3. Personal > Planning

### Navigation

Personal navigation order becomes:

```text
PERSONAL
Notes
Productivity
Planning
Journal
```

Planning route: `/app/planning`. It is owner-only, matching current Notes and Journal privacy boundaries. Navigation order is exactly Notes → Productivity → Planning → Journal. Add route aliases only for active-state matching; do not alias business Finance pages wholesale.

### Page contents

Planning owns personal-only financial surfaces with two URL-backed tabs:

- `budget`: 50/30/20 budget plus personal expense transactions (`PersonalExpensesSection`);
- `report`: personal financial report (`PersonalReportSection`).

Default tab is `budget`. Month and safe personal pagination/filter query state remain URL-backed. Extract personal loaders/rendering from Expense/Report pages into a shared personal Planning boundary so business pages do not execute personal queries and Planning does not execute business invoice/time/report queries.

Finance > Expenses and Finance > Reports become business/workspace-only. Existing personal data remains in existing tables; this is route/component ownership, not a data migration.

Legacy links redirect server-side:

- `/app/expenses?scope=personal` and `/app/expenses?tab=personal` → `/app/planning?tab=budget`;
- `/app/reports?scope=personal` → `/app/planning?tab=report`.

Preserve valid `month` and personal pagination/filter keys only. Remove Personal scope-switch controls and personal imports/render branches from Finance pages. Update docs/catalog copy and any internal links that still point to the old personal scopes.

Planning follows existing PageHeader, compact URL-backed tabs, bilingual labels, owner authorization, and responsive layout conventions. No duplicate personal surfaces remain under Finance after cutover.

## 4. Journal Quote of the Day

### Placement and UX

Place Quote of the Day directly above Today's Reflection Prompt on `/app/journal`.

Card shows:

- localized label `Quote Hari Ini / Quote of the Day`;
- quote text;
- optional short attribution;
- subtle AI marker only when generated by AI;
- no manual regenerate control.

### Daily stability

One quote is selected per user per local calendar date. Reloading during the same date returns the same quote. The quote changes when the user's timezone-local date changes.

### Generation flow

Use a dedicated persisted record keyed by `(user_id, local_date)`:

1. Resolve user timezone and local date once, reusing established personal-productivity date semantics.
2. Load today's stored quote.
3. If absent, request one short, safe reflective quote from the existing shared AI client/provider resolver with a strict short timeout.
4. Validate plain-text shape, quote length, attribution length, and forbidden markup/control characters.
5. Insert with `ON CONFLICT DO NOTHING`, then read the winning row so concurrent requests always render one persisted quote.
6. If provider/config/timeout/validation fails, select a deterministic quote from a built-in bilingual fallback pool and persist it through the same conflict path.

Generation must not reserve or charge user-facing AI quota and must not write AI chat history. Add a small server-level cooldown/failure policy so repeated concurrent first visits cannot fan out provider calls. No user journal content, private notes, client data, workspace data, or personal identifiers are sent to AI. Prompt contains only language and generic reflection requirements. Provider errors are logged without prompt secrets or user content.

### Schema

New table `personal_daily_quotes`:

- `id uuid primary key`;
- `user_id text not null` FK users cascade;
- `local_date date not null`;
- `quote text not null`;
- `attribution text nullable`;
- `source text enum(ai, fallback)`;
- `created_at timestamptz not null`;
- unique `(user_id, local_date)`.

No cron required. Lazy generation on first Journal visit minimizes cost.

## Error handling

- Expected domain failures return typed localized-safe results.
- AI timeout/failure silently falls back; Journal remains usable.
- Empty/invalid AI output is rejected before persistence.
- Concurrent quote generation uses DB uniqueness and reads winning row after conflict.
- Task creation validates project/workspace ownership exactly as before.

## Included active bug fixes

These failures were reproduced while reviewing this batch and are included because they affect the same surfaces and acceptance flow:

### Add Habit daily schedule

`HabitDialog` currently appends default weekdays even when Frequency is `daily`, while server validation correctly rejects daily habits with weekdays. Append weekdays only for `specific_weekdays`; require at least one selected day in that mode; return/display localized form errors instead of a Server Action digest.

### Existing project edit

`ProjectForm` currently resubmits `billingModel` on every edit. For a project with an invoice/time record, stale or mismatched form state can trigger the transition guard while editing unrelated fields. Pass a server-derived lock flag, disable model changes when locked, and either omit unchanged billing-model fields or make the action compare canonical current values before transition validation. Preserve edits to unrelated fields and return typed human errors.

## Testing

### Unit/wiring

- Task create defaults to visible when omitted and preserves explicit false.
- Manual form checkbox remains default-on.
- Template, AI execution, and note conversion insert paths write visible true.
- Add Habit daily sends no weekdays; Specific Days sends a non-empty deduplicated selection; failures render localized form feedback.
- Locked billing model cannot be changed by edit UI; unrelated fields remain submitted and persist.
- Project/client expected failures map to typed localized human messages; unexpected errors stay generic.
- Sidebar order, owner-only authorization, URL-backed Planning tabs, and `/app/planning` active-state wiring are correct.
- Legacy personal Finance URLs redirect while business URLs do not.
- Finance pages omit personal controls, imports, render branches, and unnecessary personal queries.
- Docs/catalog links and labels point to Planning.
- Quote selection is stable per user/timezone-local date, validates AI output, times out, and falls back deterministically.
- Quote query is user-scoped and unique per local date; conflict path reads the winning row.
- Quote generation does not consume user AI quota or write chat history.

### Runtime

- Build and lint pass.
- Migration applies to serving production DB.
- Browser desktop/mobile checks cover Planning, Journal, and sidebar ordering.
- Create one disposable task through UI: checkbox defaults on, reload persists, client portal shows it; then clean it up.
- Create one daily habit and one specific-days habit through UI; reload and DB prove schedule shape; then clean them up.
- Edit a locked-billing project without changing billing model: save succeeds and DB preserves model.
- Attempt forbidden billing transition: human message appears, no digest, DB unchanged.
- Exercise client permanent-delete success on a disposable dependency tree and blocked protected-record case if such policy exists; verify typed UI copy and cleanup.
- Legacy personal Finance URLs redirect to correct Planning tab; business Expense/Report remain reachable.
- Journal reload shows same quote; DB contains exactly one row for user/timezone-local date.
- Force AI failure in isolated test path and verify fallback without page failure.
- Fresh production log window contains no new Server Action digest for tested flows.

## Release

Commit focused source/migration/tests only. Preserve unrelated untracked scripts. Before production deploy, run shared pre-deploy guardrails, confirm `dokploy-traefik` owns 80/443, apply migration to exact production DB, rebuild SHA-tagged image, recreate only `cubiqlo-new-app-next`, then verify internal/public health, image revision, routes, logs, and DB invariants.

## Explicit non-goals

- No retroactive publication of existing private tasks.
- No deletion of invoices/time entries to permit billing changes.
- No redesign of business Finance reports.
- No quote regeneration button, personalization from private content, quote history page, sharing, or scheduled cron.
- No persistent Primary Focus implementation in this batch; that remains separate approved-but-not-implemented scope.
