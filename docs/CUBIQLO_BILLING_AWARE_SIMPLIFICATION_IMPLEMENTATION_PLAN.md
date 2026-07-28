1|# Cubiqlo Billing-Aware Simplification — Executable Implementation Plan
2|
3|**Status:** Approved product direction; Phase 0A/0B executable after additive compatibility migration 0056 is registered and applied to dev
4|**Owner:** Alip
5|**Prepared:** 28 July 2026
6|**Baseline:** canonical `origin/dev/integration` at `dfd1f4d967c0b2d001d914444da75c5114fad395`; implementation must start from a new feature worktree created from the latest remote SHA after fetch
7|**Production gate:** No production deploy or production DB migration without explicit Alip approval
8|**Canonical repo path:** `docs/CUBIQLO_BILLING_AWARE_SIMPLIFICATION_IMPLEMENTATION_PLAN.md`
9|
10|## 0. Source of Truth and Conflict Resolution
11|
12|This document supersedes:
13|
14|- `docs/PROJECT_SERVICE_ACTIVITY_TIME_PLAN.md`
15|- `/root/.hermes/shared-workspace/handoff/CUBIQLO_SIMPLE_BILLING_AWARE_WORKFLOW_PLAN.md` where conflicting
16|- Earlier decisions using `Timer | Timesheet | Riwayat`
17|- Earlier decisions using Task-first global search
18|
19|Final locked Waktu architecture:
20|
21|```text
22|Page       → history-first
23|Views      → Harian | Mingguan
24|Actions    → Catat Waktu | Mulai Timer
25|Input      → Project → Task → Description
26|Approval   → contextual action in Mingguan
27|```
28|
29|There are no `Timer | Timesheet | Riwayat` tabs in final UX.
30|
31|---
32|
33|## 1. Product Invariants
34|
35|Cubiqlo follows how client pays:
36|
37|```text
38|Harga Tetap → outcome and completion
39|Per Jam     → approved work time
40|Retainer    → approved capacity usage per period
41|```
42|
43|Core model:
44|
45|```text
46|Client
47|└── Project
48|    ├── Task
49|    ├── File
50|    ├── Expense
51|    └── Invoice
52|```
53|
54|Time applies only to Hourly and Retainer:
55|
56|```text
57|Project → Task → Work Description → Time Entry
58|```
59|
60|Removed from active product UX:
61|
62|- Package
63|- Activity
64|- Service catalog
65|- Fixed Price time tracking
66|
67|Legacy data remains readable until classified and reconciled.
68|
69|---
70|
71|## 2. ADR-001 — Canonical Billing Model
72|
73|### Decision
74|
75|Add a new canonical Project field instead of reinterpreting legacy values in place:
76|
77|```ts
78|billingModel: "fixed_price" | "hourly" | "retainer" | "legacy_package"
79|```
80|
81|Keep legacy `projects.billingType` during compatibility window:
82|
83|```ts
84|"project" | "hours" | "package"
85|```
86|
87|Mapping:
88|
89|```text
90|project → fixed_price
91|hours   → hourly
92|package → legacy_package until classified
93|```
94|
95|No automatic `package → retainer` migration. `resolveBillingModel` rules: canonical known non-null value wins; null falls back from legacy `project→fixed_price`, `hours→hourly`, `package→legacy_package`; unknown or fully null fails closed. Every guard uses this resolver, never the nullable column directly.
96|
97|### Target schema
98|
99|Migration `drizzle/0056_billing_model_compatibility.sql`:
100|
101|```sql
102|ALTER TABLE projects
103|  ADD COLUMN IF NOT EXISTS billing_model text;
104|
105|ALTER TABLE projects
106|  ADD CONSTRAINT projects_billing_model_check
107|  CHECK (billing_model IN ('fixed_price','hourly','retainer','legacy_package'));
108|
109|UPDATE projects SET billing_model = CASE
110|  WHEN billing_type = 'project' THEN 'fixed_price'
111|  WHEN billing_type = 'hours' THEN 'hourly'
112|  WHEN billing_type = 'package' THEN 'legacy_package'
113|END
114|WHERE billing_model IS NULL;
115|
116|CREATE INDEX IF NOT EXISTS projects_workspace_billing_model_idx
117|  ON projects(workspace_id, billing_model);
118|```
119|
120|Do not make `billing_model NOT NULL` until classification completes.
121|
122|### New domain helper
123|
124|Create `src/lib/billing-model.ts`:
125|
126|```ts
127|export type BillingModel =
128|  | "fixed_price"
129|  | "hourly"
130|  | "retainer"
131|  | "legacy_package";
132|
133|export function allowsTimeTracking(model: BillingModel): boolean;
134|export function allowsTimeInvoice(model: BillingModel): boolean;
135|export function defaultTaskBehavior(model: BillingModel): "one_time" | "recurring";
136|export function billingModelLabel(model: BillingModel): string;
137|export function assertSupportedBillingModel(model: BillingModel): void;
138|export function resolveBillingModel(input: { billingModel: string | null | undefined; billingType: string | null | undefined }): BillingModel;
139|```
140|
141|Rules:
142|
143|```text
144|fixed_price    → no time
145|hourly         → time allowed, hourly invoice
146|retainer       → time allowed, period usage
147|legacy_package → blocked from new mutation until classified
148|```
149|
150|---
151|
152|## 3. ADR-002 — Retainer Technical Model
153|
154|### Decision
155|
156|Retainer is a first-class billing model. It is not Package renamed.
157|
158|Configuration lives on Project. Historical period values live in immutable period snapshots.
159|
160|### Project configuration
161|
162|Migration `drizzle/0057_retainer_configuration.sql` adds:
163|
164|```sql
165|ALTER TABLE projects
166|  ADD COLUMN IF NOT EXISTS retainer_fee numeric(12,2),
167|  ADD COLUMN IF NOT EXISTS retainer_included_minutes integer,
168|  ADD COLUMN IF NOT EXISTS retainer_period_unit text,
169|  ADD COLUMN IF NOT EXISTS retainer_reset_day integer,
170|  ADD COLUMN IF NOT EXISTS retainer_overage_policy text,
171|  ADD COLUMN IF NOT EXISTS retainer_overage_rate numeric(12,2);
172|
173|ALTER TABLE projects
174|  ADD CONSTRAINT projects_retainer_period_unit_check
175|  CHECK (retainer_period_unit IS NULL OR retainer_period_unit = 'month'),
176|  ADD CONSTRAINT projects_retainer_reset_day_check
177|  CHECK (retainer_reset_day IS NULL OR retainer_reset_day BETWEEN 1 AND 28),
178|  ADD CONSTRAINT projects_retainer_overage_policy_check
179|  CHECK (retainer_overage_policy IS NULL OR retainer_overage_policy IN ('none','warn','bill'));
180|```
181|
182|Cross-column validation is mandatory in server actions and DB constraint: Retainer requires fee >= 0, included minutes >= 0, period unit `month`, reset day 1–28, valid overage policy, and overage rate >= 0 when policy is `bill`. Hourly requires a resolvable Project/workspace rate before timer/manual entry creation. Retainer regular usage does not use hourly rate; only `bill` overage requires a period-snapshotted overage rate.
183|
184|V1 decisions:
185|
186|- Period unit: monthly only.
187|- Period boundary: calendar month anchored by `retainerResetDay` 1–28.
188|- Timezone: `workspaces.timezone`; schema default UTC. No user-timezone fallback in V1.
189|- Carry-over: none in V1.
190|- Proration: none in V1. New Retainer starts on configured next period; first period can be manually invoiced.
191|- Overage policies: `none`, `warn`, `bill`.
192|- Overage is calculated when period is locked.
193|- Configuration changes apply to next unopened period only.
194|- Existing/open period keeps snapshot values.
195|- Draft/submitted time is provisional usage.
196|- Approved/invoiced time is final usage.
197|
198|### Period ledger
199|
200|Migration `drizzle/0058_retainer_period_ledger.sql` creates:
201|
202|```sql
203|CREATE TABLE retainer_periods (
204|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
205|  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
206|  project_id uuid NOT NULL,
207|  period_start date NOT NULL,
208|  period_end date NOT NULL,
209|  timezone_snapshot text NOT NULL,
210|  fee_snapshot numeric(12,2) NOT NULL,
211|  currency_snapshot text NOT NULL,
212|  included_minutes_snapshot integer NOT NULL,
213|  overage_policy_snapshot text NOT NULL,
214|  overage_rate_snapshot numeric(12,2),
215|  approved_minutes integer NOT NULL DEFAULT 0,
216|  overage_minutes integer NOT NULL DEFAULT 0,
217|  status text NOT NULL DEFAULT 'open',
218|  invoice_generation integer NOT NULL DEFAULT 0,
219|  locked_at timestamptz,
220|  invoiced_at timestamptz,
221|  created_at timestamptz NOT NULL DEFAULT now(),
222|  updated_at timestamptz NOT NULL DEFAULT now(),
223|  UNIQUE(id, workspace_id),
224|  UNIQUE(project_id, period_start, period_end),
225|  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
226|  CHECK (status IN ('open','locked','invoiced'))
227|);
228|```
229|
230|### Time-entry period linkage and consistency
231|
232|Migration 0058 also adds an explicit tenant-safe relation:
233|
234|```sql
235|ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS retainer_period_id uuid;
236|ALTER TABLE time_entries ADD CONSTRAINT time_entries_retainer_period_workspace_fk
237|  FOREIGN KEY (retainer_period_id, workspace_id)
238|  REFERENCES retainer_periods(id, workspace_id) ON DELETE RESTRICT;
239|```
240|
241|`retainer_periods` must expose `UNIQUE(id, workspace_id)` and use composite `FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT`. Classification table uses the same composite tenant FK. Server validates Project and work date fall inside period. Locked period rejects create/edit/reassign/delete/reversal.
242|
243|Consistency strategy:
244|
245|- Open period usage is calculated live from linked entries.
246|- No ad-hoc increment/decrement of aggregate minutes in time actions.
247|- Lock transaction uses `SELECT ... FOR UPDATE`, recalculates approved minutes from linked eligible entries, writes `approved_minutes` and `overage_minutes` once, then marks locked.
248|- Locked/invoiced period source entries are immutable.
249|- Configuration/timezone changes cannot move existing linked entries.
250|
251|### Invoice idempotency
252|
253|One period has at most one non-cancelled generated invoice at a time.
254|
255|Add to invoices in `drizzle/0059_invoice_source_integrity.sql`:
256|
257|```sql
258|ALTER TABLE invoices
259|  ADD COLUMN IF NOT EXISTS billing_source text,
260|  ADD COLUMN IF NOT EXISTS billing_period_start date,
261|  ADD COLUMN IF NOT EXISTS billing_period_end date,
262|  ADD COLUMN IF NOT EXISTS retainer_period_id uuid REFERENCES retainer_periods(id) ON DELETE RESTRICT;
263|
264|CREATE UNIQUE INDEX IF NOT EXISTS invoices_active_retainer_period_unique
265|  ON invoices(retainer_period_id)
266|  WHERE retainer_period_id IS NOT NULL AND status NOT IN ('cancelled');
267|```
268|
269|Retainer invoice lines:
270|
271|1. Base fee line from `fee_snapshot`.
272|2. Overage line only when policy is `bill` and overage > 0.
273|3. Expenses remain explicit invoice items; never automatically pulled into Retainer invoice in V1.
274|4. No proration line in V1.
275|5. Currency comes from period snapshot.
276|
277|Cancellation/retry:
278|
279|- `invoices.retainer_period_id` is the only authoritative invoice-period relation; `retainer_periods` has no writable `invoice_id`. Cancelling a draft/sent Retainer invoice sets period back to `locked` and increments `invoice_generation` on next generation.
280|- Paid invoice cannot be cancelled through this flow.
281|- Retry is transactional and uses unique period constraint.
282|- Same period cannot produce two active invoices.
283|
284|Create:
285|
286|- `src/lib/retainer-period.ts`
287|- `src/lib/actions/retainers.ts`
288|- `src/lib/invoice-retainer-policy.ts`
289|
290|---
291|
292|## 4. ADR-003 — Task Model
293|
294|### Decision
295|
296|Do not overload one status union. Keep current workflow status for one-time tasks and add explicit behavior/archive metadata.
297|
298|Migration `drizzle/0060_task_behavior.sql`:
299|
300|```sql
301|ALTER TABLE tasks
302|  ADD COLUMN IF NOT EXISTS behavior text,
303|  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
304|
305|ALTER TABLE tasks
306|  ADD CONSTRAINT tasks_behavior_check
307|  CHECK (behavior IS NULL OR behavior IN ('one_time','recurring'));
308|```
309|
310|Backfill:
311|
312|```text
313|fixed_price    → one_time
314|hourly         → recurring
315|retainer       → recurring
316|legacy_package → NULL / blocked pending classification
317|```
318|
319|Rules:
320|
321|### Fixed Price
322|
323|- `behavior = one_time`.
324|- Uses current workflow status normalized in UI:
325|  - `todo` → Belum Mulai
326|  - `in_progress` and `review` → Dikerjakan
327|  - `done` → Selesai
328|- Keep `review` internally during compatibility; milestone/client approval becomes separate later.
329|
330|### Hourly/Retainer
331|
332|- `behavior = recurring`.
333|- Available when `archivedAt IS NULL`.
334|- Archived when `archivedAt IS NOT NULL`.
335|- Do not use `done` as recurring lifecycle.
336|- Existing status remains compatibility metadata but is not rendered as Kanban workflow.
337|
338|Billing model transition:
339|
340|- New Project can choose any supported model.
341|- Billing model becomes immutable once Project has any time entry, invoice, milestone, retainer period, or accepted proposal snapshot.
342|- Empty Project may change model transactionally; Task behavior is re-derived.
343|- `legacy_package` cannot transition through normal form. It uses classification workflow.
344|
345|Update:
346|
347|- `src/lib/actions/projects.ts`
348|- `src/lib/actions/tasks.ts`
349|- `src/components/forms/project-form.tsx`
350|- `src/components/forms/task-form.tsx`
351|- `src/components/tasks/project-tasks-tab.tsx`
352|
353|---
354|
355|## 5. ADR-004 — Time Input and Required Fields
356|
357|### Final decision
358|
359|Both manual and timer use:
360|
361|```text
362|Project → Task → Description
363|```
364|
365|Reason: global Task search becomes too large and ambiguous across clients.
366|
367|Rules:
368|
369|### Manual entry
370|
371|Required before save:
372|
373|- Project
374|- Task
375|- Description
376|- Duration
377|- Work date
378|
379|### Timer start
380|
381|Required before start:
382|
383|- Project
384|- Task
385|
386|Description is optional at start but required before stop/finalization.
387|
388|### Quick timer
389|
390|- Remove empty quick-start from new Waktu UI and topbar.
391|- Topbar opens `Mulai Timer` dialog or navigates to `/app/time?action=timer`.
392|- Legacy active timers without Task remain completable through compatibility stop dialog.
393|
394|### Legacy no-Task time
395|
396|- Readable in internal history.
397|- Label: `Tanpa Task (legacy)`.
398|- Immutable if Fixed Price.
399|- For Hourly/Retainer legacy rows, owner may assign a Task before approval/invoice.
400|- Never client-visible or invoice-eligible until Task and Description exist.
401|
402|### Description
403|
404|- Required for manual entry.
405|- Required at stop.
406|- Required before approval and invoice.
407|- Client sees description only for approved/invoiced Hourly/Retainer records.
408|
409|---
410|
411|## 6. ADR-005 — Fixed Price Historical Time
412|
413|Historical Fixed Price entries are:
414|
415|- admin/owner readable;
416|- immutable;
417|- non-billable;
418|- excluded from new approval;
419|- excluded from invoice import;
420|- excluded from client portal;
421|- excluded from client-facing exports;
422|- excluded from active operational time reports;
423|- optionally available in an internal legacy audit export.
424|
425|Forbidden mutations:
426|
427|- edit description;
428|- change date/duration;
429|- reassign Project/Task;
430|- delete;
431|- approve;
432|- invoice;
433|- resume.
434|
435|`canMutateHistoricalTimeEntry()` must check billing model, not only `timeTrackingMode`.
436|
437|---
438|
439|## 7. ADR-006 — Rate Precedence After Activity Removal
440|
441|V1 does not add Task rate overrides.
442|
443|New time rate precedence:
444|
445|```text
446|existing entry snapshot
447|→ Retainer overage snapshot when generating overage invoice
448|→ Project hourly rate snapshot
449|→ workspace default hourly rate if Project rate missing
450|→ reject billable Hourly entry when no rate can be resolved
451|```
452|
453|Activity rates and project-Activity overrides are legacy read-only inputs only.
454|
455|Rules:
456|
457|- New time write never calls `resolveActivityHourlyRate`.
458|- New entries snapshot resolved rate and currency.
459|- Changing Project/workspace rate never changes historical entry snapshots.
460|- Existing historical Activity rate remains visible only in internal legacy audit.
461|
462|Update:
463|
464|- `src/lib/actions/time.ts`
465|- `src/lib/time-entry-context.ts`
466|- `src/lib/project-time-tracking-policy-db.ts`
467|
468|---
469|
470|## 8. ADR-007 — Service Snapshot and Invoice Behavior
471|
472|Service catalog UI is retired, but historical commercial snapshots remain.
473|
474|### Existing projects
475|
476|- Existing `projectServices` remain readable.
477|- Existing invoice/proposal lines keep original snapshots.
478|- Existing project service snapshots become immutable after cutover.
479|- No catalog-driven edits from Project form.
480|
481|### New projects
482|
483|- Do not create `projectServices` from Service catalog.
484|- Fixed Price invoice source:
485|  1. approved milestone amount when milestone selected;
486|  2. otherwise remaining agreed Project fixed amount/budget.
487|- Hourly invoice source: approved uninvoiced Hourly time.
488|- Retainer invoice source: period snapshot.
489|
490|### Legacy invoice rendering
491|
492|- Continue rendering existing Service/Package descriptions and amounts from snapshots.
493|- Never recalculate sent/paid historical invoices from current catalog data.
494|
495|Do not drop `services`, `project_services`, or related snapshot columns until all proposal/invoice/portal/profitability read paths are cut over.
496|
497|---
498|
499|## 9. ADR-008 — Approval and Locking
500|
501|Roles:
502|
503|- Workspace owner can approve other users.
504|- Workspace admin can approve other users when writable permission exists.
505|- No user can approve their own submitted week.
506|- Owner/admin own entries are auto-approved at creation.
507|- Member entries begin draft.
508|
509|Lifecycle:
510|
511|```text
512|draft → submitted → approved
513|                  ↘ rejected → draft after explicit reopen
514|approved → invoiced
515|```
516|
517|Rules:
518|
519|- Rejected state remains.
520|- Submitted, approved, invoiced entries are locked.
521|- Rejection returns entries to draft transactionally.
522|- Approved entry modification requires explicit reversal by owner/admin, audit log, and must fail if invoiced.
523|- Invoice import locks source atomically.
524|- Week boundaries use workspace timezone.
525|- Entry belongs to week by effective work date:
526|  - manual: `workDate`;
527|  - timer: converted `startTime`.
528|- Retainer provisional usage: draft + submitted + approved.
529|- Retainer final usage: approved + invoiced.
530|- Client visibility: approved + invoiced only.
531|
532|Approval remains contextual in Mingguan view. No permanent Approval tab.
533|
534|---
535|
536|## 10. Final Waktu UX
537|
538|Final page:
539|
540|```text
541|Waktu
542|
543|[‹] [Selected date/period] [›] [Hari Ini]       [Harian | Mingguan]
544|
545|[+ Catat Waktu] [Mulai Timer]
546|
547|Total selected period
548|History rows
549|```
550|
551|No:
552|
553|- Timer card form permanently displayed;
554|- Timer/Timesheet/History tabs;
555|- Activity;
556|- KPI/filter/pagination block;
557|- Package/Service selectors.
558|
559|### Daily
560|
561|Row hierarchy:
562|
563|```text
564|Project · Client
565|Task
566|Description
567|Duration
568|```
569|
570|### Weekly
571|
572|Desktop summary by Project+Task. Mobile sections by day.
573|
574|Contextual approval:
575|
576|- Member: `Kirim Minggu Ini`.
577|- Owner/admin: `Tinjau` pending submissions.
578|
579|### Two dialogs
580|
581|`Catat Waktu`:
582|
583|```text
584|Project
585|Task
586|Description
587|Duration
588|Date
589|```
590|
591|`Mulai Timer`:
592|
593|```text
594|Project
595|Task
596|Description (optional at start)
597|```
598|
599|Selectors contain only active, accessible Hourly/Retainer Projects and active recurring Tasks.
600|
601|---
602|
603|## 11. Phase 0A — Additive Billing Compatibility, Then Server Containment
604|
605|This phase must ship before or in the same release as any UI hiding. Ordering is mandatory: Phase 0A.1 applies additive migration 0056 and updates Drizzle schema; Phase 0A.2 deploys dual-read resolution and mutation guards. Retainer migrations 0057+ remain later.
606|
607|### Files
608|
609|- `src/lib/billing-model.ts` — new.
610|- `src/lib/project-time-tracking-policy.ts`.
611|- `src/lib/project-time-tracking-policy-db.ts`.
612|- `src/lib/time-entry-context.ts`.
613|- `src/lib/actions/time.ts`.
614|- `src/lib/actions/invoices.ts`.
615|- `src/app/api/time/active/route.ts`.
616|- `src/lib/actions/timesheet-approval.ts`.
617|
618|### Required guards
619|
620|- `startTimer` rejects Fixed Price and `legacy_package`.
621|- `startTimerFromTask` rejects Fixed Price and `legacy_package`.
622|- `resumeTimer` rejects active timer attached to Fixed Price.
623|- `stopTimer` rejects reassignment to Fixed Price.
624|- `createManualEntry` rejects Fixed Price.
625|- `setWeeklyTimeCell` rejects Fixed Price.
626|- `updateTimeEntry` rejects Fixed Price and unsafe reassignment.
627|- `importTimeEntries` rejects Fixed Price/Retainer base-fee misuse.
628|- `/api/time/active` excludes Fixed Price from options.
629|- Approval excludes Fixed Price and uses effective work date.
630|
631|### Failing tests first
632|
633|Create:
634|
635|- `src/lib/billing-model.test.ts`.
636|- `src/lib/fixed-price-time-negative-wiring.test.ts`.
637|- `src/lib/time-entry-context.test.ts`.
638|- `src/lib/invoice-source-integrity.test.ts`.
639|
640|### Verification
641|
642|```bash
643|npm test -- src/lib/billing-model.test.ts \
644|  src/lib/project-time-tracking-policy.test.ts \
645|  src/lib/time-entry-context.test.ts \
646|  src/lib/fixed-price-time-negative-wiring.test.ts \
647|  src/lib/invoice-source-integrity.test.ts
648|npm run lint
649|npx tsc --noEmit
650|```
651|
652|Expected:
653|
654|- Fixed Price rejected across all mutation paths.
655|- Legacy Fixed history remains readable.
656|- No UI code required for server protection.
657|
658|### Commit boundary
659|
660|```text
661|fix: block fixed-price time mutations
662|```
663|
664|### Rollback
665|
666|Revert code commit only. No destructive schema change in Phase 0A.
667|
668|---
669|
670|## 12. Phase 0B — Data Profiling and Classification
671|
672|### Profiling SQL
673|
674|Create `scripts/sql/billing-aware-preflight.sql` with:
675|
676|```sql
677|-- Project counts by legacy and canonical model
678|SELECT billing_type, billing_model, count(*)
679|FROM projects GROUP BY billing_type, billing_model ORDER BY 1,2;
680|
681|-- Package classification evidence
682|SELECT p.id, p.name, p.billing_type, p.selected_package_id,
683|       pk.name AS package_name, pk.hours, pk.allowance_type,
684|       pk.allowance_value, pk.lifecycle_class,
685|       count(DISTINCT te.id) AS time_entries,
686|       count(DISTINCT i.id) AS invoices
687|FROM projects p
688|LEFT JOIN packages pk ON pk.id = p.selected_package_id
689|LEFT JOIN time_entries te ON te.project_id = p.id
690|LEFT JOIN invoices i ON i.project_id = p.id
691|WHERE p.billing_type = 'package'
692|GROUP BY p.id, pk.id;
693|
694|-- Fixed Price time states
695|SELECT p.id, p.name, te.status, (ii.id IS NOT NULL) AS invoiced,
696|       count(DISTINCT te.id) AS entries, sum(te.duration_minutes) AS minutes
697|FROM projects p
698|JOIN time_entries te ON te.project_id = p.id
699|LEFT JOIN invoice_items ii
700|  ON ii.source_type = 'time_entry' AND ii.source_id = te.id
701|WHERE p.billing_type = 'project'
702|GROUP BY p.id, p.name, te.status, (ii.id IS NOT NULL);
703|
704|-- Open timers on non-hourly candidates
705|SELECT te.id, te.user_id, te.project_id, p.billing_type, p.billing_model
706|FROM time_entries te
707|LEFT JOIN projects p ON p.id = te.project_id
708|WHERE te.end_time IS NULL;
709|
710|-- Dependency counts
711|SELECT
712|  (SELECT count(*) FROM project_activities) AS project_activities,
713|  (SELECT count(*) FROM time_entries WHERE activity_id IS NOT NULL) AS activity_time_entries,
714|  (SELECT count(*) FROM project_services) AS project_services,
715|  (SELECT count(*) FROM package_orders) AS package_orders,
716|  (SELECT count(*) FROM custom_package_requests) AS custom_package_requests;
717|```
718|
719|Add more queries for proposal/package/service relations as discovered.
720|
721|### Classification table
722|
723|Migration `drizzle/0061_legacy_billing_classification.sql`:
724|
725|```sql
726|CREATE TABLE legacy_project_billing_classifications (
727|  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE RESTRICT,
728|  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
729|  legacy_billing_type text NOT NULL,
730|  target_billing_model text,
731|  confidence text NOT NULL DEFAULT 'unreviewed',
732|  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
733|  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
734|  reviewed_at timestamptz,
735|  notes text,
736|  CHECK (target_billing_model IS NULL OR target_billing_model IN ('fixed_price','retainer')),
737|  CHECK (confidence IN ('unreviewed','automatic','manual','blocked'))
738|);
739|```
740|
741|### Deterministic mapping
742|
743|- `project` → Fixed Price automatic.
744|- `hours` → Hourly automatic.
745|- `package` with explicit recurring lifecycle + monthly hours allowance + recurring invoice evidence → Retainer candidate.
746|- `package` with one-off outcome + fixed invoice evidence → Fixed Price candidate.
747|- Contradictory/incomplete → blocked manual review.
748|
749|No migration continues while blocked count > 0 for target rows being cut over.
750|
751|### Artifact
752|
753|Write profiling result to:
754|
755|```text
756|docs/audits/BILLING_AWARE_PREFLIGHT_DEV_YYYYMMDD.md
757|```
758|
759|### Commit boundary
760|
761|```text
762|chore: add billing migration preflight
763|```
764|
765|### Rollback
766|
767|Drop only additive classification table if unused. Never modify legacy rows in this phase.
768|
769|---
770|
771|## 13. Completeness Ledger
772|
773|Every reference must be classified before deletion.
774|
775|Legend:
776|
777|- `HIDE`: remove active UI entry.
778|- `FREEZE`: reject new writes.
779|- `COMPAT_READ`: preserve historical read.
780|- `MIGRATE`: move to target model.
781|- `DELETE_LATER`: remove after reconciliation.
782|- `DEFER`: retain intentionally.
783|
784|### Package
785|
786|| Surface | Path | Action |
787||---|---|---|
788|| Package actions | `src/lib/actions/packages.ts` | FREEZE → COMPAT_READ → DELETE_LATER |
789|| Orders | `src/lib/actions/package-orders.ts` | FREEZE public create; COMPAT_READ/admin transition |
790|| Custom requests | `src/lib/actions/custom-package-requests.ts` | FREEZE create; COMPAT_READ/resolve pending |
791|| Catalog UI | `src/components/packages/package-catalog.tsx` | HIDE |
792|| Portal order CTA | `src/components/portal/package-order-button.tsx` | HIDE; preserve historical order display |
793|| Portal custom request | `src/components/portal/custom-package-request-form.tsx` | HIDE; preserve historical request display |
794|| Project form | `src/components/forms/project-form.tsx` | HIDE Package selection; MIGRATE classified legacy |
795|| Invoice package amount | `src/lib/actions/invoices.ts` | COMPAT_READ old snapshots; replace new path |
796|| Portal project branch | `src/components/portal/project-accordion.tsx` | MIGRATE Retainer/Fixed branches |
797|| Tables | `packages`, `package_items`, `project_package_assignments` | COMPAT_READ → DELETE_LATER |
798|| Order/request tables | `package_orders`, `custom_package_requests` | DEFER historical ledger; do not drop in first cleanup |
799|
800|### Activity
801|
802|| Surface | Path | Action |
803||---|---|---|
804|| CRUD | `src/lib/actions/activities.ts` | FREEZE |
805|| Policy | `src/lib/activity-policy.ts` | remove from new writes; COMPAT_READ legacy |
806|| DB policy | `src/lib/activity-policy-db.ts` | replace with Task/Project policy |
807|| Timer form | `src/components/time/timer-widget.tsx` | HIDE/remove |
808|| Manual form | `src/components/time/manual-entry-form.tsx` | HIDE/remove |
809|| Stop dialog | `src/components/time/stop-timer-dialog.tsx` | HIDE for new; legacy compatibility only |
810|| Weekly grid | `src/components/time/weekly-time-grid.tsx` | MIGRATE Project+Task |
811|| History | `src/components/time/timesheet.tsx` | no active Activity filter; legacy audit only |
812|| Rate calculation | `src/lib/actions/time.ts` | MIGRATE to Project rate snapshot |
813|| Reports/exports | reports and time export routes | MIGRATE to Task; legacy audit optional |
814|| Tables | `activities`, `project_activities` | COMPAT_READ → DELETE_LATER |
815|| `time_entries.activity_id` | schema | preserve until snapshot/reconciliation; then remove |
816|| `activity_logs` | audit log domain | DEFER; never delete |
817|
818|### Service
819|
820|| Surface | Path | Action |
821||---|---|---|
822|| Catalog actions/UI | `src/lib/actions/services.ts`, `src/components/services/service-catalog.tsx` | FREEZE/HIDE |
823|| Project form selection | `src/components/forms/project-form.tsx` | HIDE for new Project |
824|| Proposal snapshots | `src/lib/actions/proposals.ts`, `src/lib/service-snapshots.ts` | COMPAT_READ |
825|| Project lines | `project_services` | DEFER as historical commercial snapshot |
826|| Invoice seeding | `src/lib/actions/invoices.ts` | COMPAT_READ legacy; no new catalog line generation |
827|| Task/time FK | `tasks.project_service_id`, `time_entries.project_service_id` | COMPAT_READ; remove only after dependency migration |
828|| Profitability | `src/lib/service-profitability-report.ts` | DEFER or redesign separately |
829|| Rate cards | `client_service_rate_cards` | DEFER until Project-rate replacement reconciled |
830|
831|Before code deletion, generate exhaustive search artifact:
832|
833|```bash
834|rg -n "package|Package|activityId|activities|projectActivities|serviceId|projectServices|billingType|selectedPackageId" src drizzle scripts docs \
835|  > docs/audits/BILLING_AWARE_REFERENCE_LEDGER.txt
836|```
837|
838|Every line must map to one ledger action.
839|
840|---
841|
842|## 14. Billing Mutation Matrix
843|
844|| Path | Fixed Price | Hourly | Retainer | Legacy Package |
845||---|---|---|---|---|
846|| Timer start | Reject | Allow | Allow + resolve period | Reject |
847|| Timer resume | Reject | Allow | Allow | Reject |
848|| Timer stop/reassign | Reject target | Allow | Allow + period | Reject target |
849|| Manual entry | Reject | Allow | Allow + period | Reject |
850|| Weekly save/copy | Reject | Allow | Allow + period | Reject |
851|| Update entry | Immutable legacy only | Allow if draft | Allow if draft | Reject |
852|| Submit approval | Exclude | Member allow | Member allow | Exclude |
853|| Approve | Exclude | Other owner/admin | Other owner/admin | Exclude |
854|| Invoice import | Reject | Approved only | Reject base path; overage via period | Reject |
855|| Active timer options | Exclude | Include | Include | Exclude |
856|| Client portal time | Never | approved/invoiced | approved/invoiced current/history period | compatibility-safe only |
857|
858|---
859|
860|## 15. Billing Transition Matrix
861|
862|| Transition | Rule |
863||---|---|
864|| Fixed → Hourly | Allow only empty Project; derive recurring Tasks or require explicit conversion preview |
865|| Fixed → Retainer | Allow only empty Project; require full Retainer config |
866|| Hourly → Fixed with draft time | Block normal edit; migration wizard must resolve/archive time |
867|| Hourly → Fixed with approved time | Block |
868|| Hourly → Fixed with invoiced time | Permanently block normal edit |
869|| Hourly → Retainer | Block normal edit after time/invoice; migration wizard creates first period and preserves historical Hourly entries |
870|| Retainer → Hourly | Block after period exists |
871|| Package → Retainer | Classification workflow only |
872|| Package → Fixed | Classification workflow only |
873|| Ambiguous Package | Remains `legacy_package`; all new mutations blocked |
874|
875|---
876|
877|## 16. Invoice Integrity Matrix
878|
879|### Verified existing invoice source integrity
880|
881|`src/db/schema.ts` already defines `invoice_items.source_type`, `source_id`, `previous_time_entry_status`, partial unique index `invoice_items_time_entry_source_uidx`, and `invoice_items_source_lookup_idx`. Migration 0059 audits actual dev DB parity and must not recreate duplicate columns/indexes. Its new scope is `invoices.retainer_period_id`, billing period/source fields, composite tenant checks where needed, and Retainer uniqueness only.
882|
883|Required invariants:
884|
885|- One time entry cannot belong to two invoices.
886|- One Retainer period cannot have two non-cancelled invoices.
887|- Fixed invoice cannot accept `time_entry` source.
888|- Retainer base fee uses period snapshot, never current Project value.
889|- Overage uses approved minutes at period lock.
890|- Overage cannot be billed twice.
891|- Currency/rate snapshots never change after source mutation.
892|- Tenant cannot import another workspace source ID.
893|- Draft invoice reversal restores exact previous source status.
894|- Sent invoice reversal requires explicit owner/admin cancellation.
895|- Paid invoice source cannot be detached.
896|
897|Migration 0059 does not add invoice-item source columns or duplicate indexes. They already exist. Audit dev DB parity against `src/db/schema.ts`; preserve `invoice_items_time_entry_source_uidx`, `invoice_items_source_lookup_idx`, and `previous_time_entry_status`. Add only missing Retainer invoice-period fields and constraints.
898|
899|---
900|
901|## 17. Portal and Privacy Matrix
902|
903|### Fixed Price
904|
905|Expose:
906|
907|- scope;
908|- Task progress;
909|- milestones;
910|- files/deliverables;
911|- approvals;
912|- invoices.
913|
914|Never expose time through:
915|
916|- HTML;
917|- RSC payload;
918|- server component props;
919|- public API/token endpoint;
920|- PDF/XLSX export;
921|- activity feed description;
922|- hidden DOM.
923|
924|### Hourly/Retainer
925|
926|Expose only approved/invoiced entries with:
927|
928|- Project;
929|- Task;
930|- description;
931|- user display name;
932|- duration;
933|- work date.
934|
935|Never expose draft/submitted time.
936|
937|Legacy Activity label appears only in internal legacy audit, not client portal.
938|
939|Public Package/order/request creation routes become unavailable. Historical records remain admin/client compatibility-readable only when authorization remains valid.
940|
941|---
942|
943|## 18. Implementation Phases
944|
945|### Phase 0A — Server containment
946|
947|Implement Section 11. No UI redesign first.
948|
949|### Phase 0B — Profiling/classification
950|
951|Implement Section 12. No destructive migration.
952|
953|### Phase 1 — Waktu history-first UX
954|
955|Files:
956|
957|- `src/app/(app)/app/time/page.tsx`
958|- `src/components/time/time-route-content.tsx`
959|- `src/components/time/time-header.tsx`
960|- `src/components/time/manual-entry-form.tsx`
961|- `src/components/time/timer-widget.tsx`
962|- `src/components/time/stop-timer-dialog.tsx`
963|- new `src/components/time/waktu-history.tsx`
964|- new `src/components/time/add-time-log-dialog.tsx`
965|- new `src/components/time/new-timer-dialog.tsx`
966|- new `src/components/time/active-timer-card.tsx`
967|- new `src/lib/effective-work-date.ts`
968|
969|Deliver:
970|
971|- Harian/Mingguan.
972|- Date navigation.
973|- Two dialogs.
974|- Project→Task cascade.
975|- Current-user/date-scoped DB query.
976|- Manual duration visible.
977|- Active timer sync.
978|- Compatibility redirects.
979|
980|Commit:
981|
982|```text
983|feat: redesign time tracking around daily history
984|```
985|
986|Rollback: revert UI commit; server containment remains.
987|
988|### Phase 2 — Weekly and approval correctness
989|
990|Files:
991|
992|- `src/components/time/weekly-time-grid.tsx`
993|- `src/lib/weekly-time-grid.ts`
994|- `src/components/time/timesheet-approval-panel.tsx`
995|- `src/lib/actions/timesheet-approval.ts`
996|- `src/lib/timesheet-approval.ts`
997|
998|Deliver:
999|
1000|- Project+Task weekly rows.
1001|- Effective work date.
1002|- Contextual approval.
1003|- Owner/admin own-time auto-approved.
1004|- Notes isolated per submission.
1005|- Lock/reject/reopen behavior.
1006|
1007|Commit:
1008|
1009|```text
1010|feat: align weekly time approval with task workflow
1011|```
1012|
1013|### Phase 3 — Billing schema compatibility
1014|
1015|Apply migrations `0056`–`0061` only after dry-run on dev clone.
1016|
1017|Commit:
1018|
1019|```text
1020|feat: add billing-aware compatibility schema
1021|```
1022|
1023|Rollback:
1024|
1025|- additive columns/tables remain harmless;
1026|- app dual-reads old fields;
1027|- never drop legacy schema in rollback window.
1028|
1029|### Phase 4 — Project/Task contextual UX
1030|
1031|Files:
1032|
1033|- `src/components/forms/project-form.tsx`
1034|- `src/lib/actions/projects.ts`
1035|- `src/components/forms/task-form.tsx`
1036|- `src/lib/actions/tasks.ts`
1037|- Project detail/task components.
1038|
1039|Deliver:
1040|
1041|- Harga Tetap, Per Jam, Retainer contextual fields.
1042|- One-time vs recurring behavior.
1043|- Unsafe transition block.
1044|- Package/Activity/Service controls absent.
1045|
1046|### Phase 5 — Fixed Price outcome workflow
1047|
1048|Deliver milestones, fixed invoice source, portal no-time branch.
1049|
1050|### Phase 6 — Hourly invoice integrity
1051|
1052|Deliver approved-time invoice import, source uniqueness, reversal rules.
1053|
1054|### Phase 7 — Retainer period ledger
1055|
1056|Deliver period creation, usage, lock, base+overage invoice, idempotent cron.
1057|
1058|### Phase 8 — Legacy cutover
1059|
1060|Resolve classifications; cut over reads; preserve historical snapshots.
1061|
1062|### Phase 9 — Destructive cleanup
1063|
1064|Separate explicit approval required. Backup, reconciliation, migration dry-run, then remove obsolete Package/Activity dependencies and tables. Service schema is separate decision.
1065|
1066|---
1067|
1068|## 19. Test Files and Expected Results
1069|
1070|### Billing model
1071|
1072|- `src/lib/billing-model.test.ts`
1073|- `src/lib/project-time-tracking-policy.test.ts`
1074|- `src/lib/time-entry-context.test.ts`
1075|
1076|Expected: Fixed/legacy Package reject time; Hourly/Retainer allow valid Task context.
1077|
1078|### Mutation matrix
1079|
1080|- `src/lib/fixed-price-time-negative-wiring.test.ts`
1081|- DB integration test for every row in Section 14.
1082|
1083|### Transition matrix
1084|
1085|- `src/lib/billing-transition-policy.test.ts`
1086|
1087|Expected: only empty supported transitions pass; transactional history blocks unsafe changes.
1088|
1089|### Retainer
1090|
1091|- `src/lib/retainer-period.test.ts`
1092|- `src/lib/retainer-invoice-policy.test.ts`
1093|
1094|Expected:
1095|
1096|- month boundary/timezone correct;
1097|- reset day 1–28;
1098|- no carry-over;
1099|- config changes next period;
1100|- unique active invoice;
1101|- cancellation/retry safe;
1102|- overage once.
1103|
1104|### Invoice
1105|
1106|- `src/lib/invoice-source-integrity.test.ts`
1107|
1108|Expected Section 16 invariants.
1109|
1110|### Portal
1111|
1112|- `src/lib/portal-billing-visibility.test.ts`
1113|- authenticated/public browser E2E.
1114|
1115|Expected no Fixed time in HTML, RSC payload, API, exports.
1116|
1117|### Approval
1118|
1119|- member cannot self-approve;
1120|- admin/owner can approve others;
1121|- owner/admin own entries auto-approved;
1122|- selected timezone week correct;
1123|- manual and timer entries included;
1124|- approved/invoiced lock.
1125|
1126|### Commands per commit
1127|
1128|```bash
1129|npm run lint
1130|npx tsc --noEmit
1131|npm test
1132|npm run build -- --webpack
1133|```
1134|
1135|Before phase merge:
1136|
1137|```bash
1138|npm audit --omit=dev
1139|node scripts/smoke.mjs
1140|```
1141|
1142|After dev deployment:
1143|
1144|- authenticated browser mutation E2E;
1145|- 1440×1000, 768×1024, 390×844, 375×812;
1146|- `/api/health` returns `{"status":"ok","db":"ok"}`;
1147|- source SHA = image revision = `dev/integration` SHA;
1148|- production container ID/created timestamp unchanged.
1149|
1150|---
1151|
1152|## 20. Baseline and Worktree Gate
1153|
1154|Before implementation:
1155|
1156|```bash
1157|git fetch origin
1158|git rev-parse origin/dev/integration
1159|git status --short
1160|git worktree add <new-path> -b feat/billing-aware-phase0 origin/dev/integration
1161|```
1162|
1163|Do not implement on `feat/mh1-weekly-track` or the shared root checkout. Canonical paths verified existing at `dfd1f4d`: `src/components/time/time-route-content.tsx`, `src/components/time/time-header.tsx`, `src/components/forms/task-form.tsx`, and `src/components/tasks/project-tasks-tab.tsx`. New component paths remain explicitly marked `new`. The implementation baseline SHA must be updated in the first phase audit artifact to the remote SHA observed at worktree creation.
1164|
1165|## 21. Commit and Deployment Boundaries
1166|
1167|Each phase:
1168|
1169|1. Start from clean branch/worktree.
1170|2. Write failing invariant tests.
1171|3. Implement minimum code.
1172|4. Run targeted tests.
1173|5. Run lint/typecheck/full tests/build.
1174|6. Commit one coherent phase.
1175|7. Push feature branch.
1176|8. Merge into `dev/integration` only after gate.
1177|9. Deploy dev.
1178|10. Verify runtime/browser/DB.
1179|11. Update changelog, migration registry, audit artifact.
1180|12. Never deploy production without explicit Alip approval.
1181|
1182|---
1183|
1184|## 22. Definition of Done
1185|
1186|A task is not done because UI disappeared.
1187|
1188|Done requires:
1189|
1190|- exact server invariant enforced;
1191|- tenant/permission validation;
1192|- migration registered and reversible/additive where possible;
1193|- historical data preserved;
1194|- mutation test passes;
1195|- browser flow passes;
1196|- DB reconciliation passes;
1197|- dev source/image/health match;
1198|- docs and ledger updated;
1199|- commit pushed;
1200|- production unchanged.
1201|
1202|---
1203|
1204|## 23. Canonical Summary
1205|
1206|```text
1207|Package                 → freeze, classify, compatibility-read, remove later
1208|Activity                → freeze, remove from new writes, compatibility-read, remove later
1209|Service catalog         → hide/freeze; preserve commercial snapshots
1210|Billing model           → fixed_price | hourly | retainer | legacy_package
1211|Fixed Price             → outcome only; no mutable/client-visible time
1212|Hourly                  → recurring Task + approved time + hourly invoice
1213|Retainer                → recurring Task + monthly period ledger + base/overage invoice
1214|Task input               → Project first, then Task
1215|Task requirement         → required at manual save and timer start
1216|Description requirement  → manual save and timer stop
1217|Rate                     → entry snapshot → Project rate → workspace default
1218|Waktu                    → history-first Harian/Mingguan
1219|Actions                  → Catat Waktu | Mulai Timer
1220|Approval                 → weekly contextual; owner/admin approve others
1221|Owner/admin own time     → auto-approved
1222|Client time              → approved/invoiced Hourly/Retainer only
1223|Legacy Fixed time        → internal immutable audit only
1224|Production               → hold until explicit approval
1225|```
1226|
1227|This document is implementation-ready for Phase 0A and Phase 0B after starting from a fresh feature worktree based on the latest `origin/dev/integration`, reserving 0056 in the actual migration registry, and confirming dev migration-ledger status. Later destructive cleanup remains gated by dev profiling/classification evidence and explicit approval.
1228|
1229|
1230|
