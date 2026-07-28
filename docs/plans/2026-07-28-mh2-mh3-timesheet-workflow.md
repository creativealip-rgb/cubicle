# MH2–MH3 Timesheet Workflow Plan

## Scope

### MH2 — Weekly approval
- Add `timesheet_submissions` keyed by workspace, user, and Monday `week_start`.
- Lifecycle: `submitted → approved | rejected`; rejected week can be resubmitted.
- Submission snapshots week totals and note, but entries remain canonical in `time_entries`.
- Submitter can submit own completed entries only.
- Owner can approve/reject; rejection requires note.
- Submitted week blocks create/edit/delete/grid mutation for submitter.
- Approval changes matching non-invoiced entries to `approved`; approved/invoiced entries remain locked.
- Rejection returns matching entries to `draft` and unlocks week.

### MH3 — Time reporting
- Add pure report aggregator grouped by project, task, and member.
- Summaries: total, billable, non-billable minutes, billable value from hourly-rate snapshots.
- Existing report period controls remain source of date filtering.
- Add visible Time Performance section to `/app/reports`.
- Add `Time Tracking` worksheet to existing XLSX export.

## Delivery
1. Schema + additive migration `0051_timesheet_approval.sql`.
2. RED tests for lifecycle wiring and report aggregation.
3. Server actions and mutation lock guard.
4. Approval panel on `/app/time`; weekly grid shows state and actions.
5. Report helper, page section, XLSX sheet.
6. Full test, lint, build, DB integration, Docker dev smoke.
7. Commit and push feature branch. No production deploy.

## Safety
- Workspace scope on every read/write.
- Owner-only review.
- No destructive migration or status downgrade for invoiced entries.
- Approved entries never editable from normal timesheet UI/actions.
- Existing timer history preserved.
