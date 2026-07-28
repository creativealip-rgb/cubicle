# MH1 Weekly Track Design

**Date:** 2026-07-28  
**Project:** Cubiqlo  
**Status:** Approved for implementation planning

## Goal

Add a My Hours-style weekly time-entry workflow to `/app/time` without replacing Cubiqlo's existing timer, team timesheet, detailed timesheet, Activity metadata, or invoice controls.

## User Workflow

1. User opens the Weekly tab.
2. User selects a week with previous, current, and next controls.
3. User adds a row by selecting a writable Project and optional Task.
4. User enters duration in a Monday–Sunday cell using `2`, `2:30`, or `2h 30m`.
5. Grid saves the manual duration and recalculates row, day, and weekly totals.
6. User can copy Project/Task row structure from the previous week without copying hours.

## Recommended Architecture

Use an editable aggregate grid backed by existing `time_entries` records. No database migration.

### Units

- `src/lib/weekly-time-grid.ts`
  - Week boundary calculation.
  - Duration parsing and formatting.
  - Grouping entries by Project, Task, and local calendar day.
  - Row and column total calculation.
- `src/lib/actions/time.ts`
  - Server action for setting a weekly grid cell.
  - Server action for copying previous-week row structure if persisted row state is required.
- `src/components/time/weekly-time-grid.tsx`
  - Week navigation.
  - Project/Task row picker.
  - Desktop grid.
  - Mobile stacked day layout.
  - Save state and error feedback.
- `src/app/(app)/app/time/page.tsx`
  - Query week-scoped entries.
  - Pass writable projects, tasks, permissions, and current user data into grid.

## Data Rules

### Row identity

A row is identified by:

```text
workspaceId + userId + projectId + taskId
```

`taskId` may be null when project policy permits project-level tracking.

Activity remains metadata on individual entries. It does not participate in primary weekly row identity for MH1.

### Cell aggregation

A cell represents total editable manual minutes for one row and one local calendar day.

Existing timer-created records remain visible in totals but are not silently rewritten by grid edits. Grid-managed manual records must be identifiable through deterministic metadata or a narrowly scoped record selection rule documented in implementation plan.

### Setting a cell

- Empty or `0` removes only grid-managed manual duration.
- Positive input creates or updates one grid-managed manual entry.
- Timer history, invoiced entries, approved entries, and locked entries remain untouched.
- Multiple historical entries may contribute to displayed total, but grid writes only its managed manual entry.

This means displayed total can include immutable minutes. User cannot set a cell below immutable minutes; UI returns a clear validation error.

### Duration input

Accepted:

- `2` = 2 hours
- `2:30` = 2 hours 30 minutes
- `2h 30m` = 2 hours 30 minutes
- `90m` = 90 minutes

Rejected:

- negative values
- malformed values
- values over 24 hours per cell

## Permissions and Safety

- Owner and Member can edit.
- Viewer receives read-only grid.
- Projects with `timeTrackingMode = "off"` cannot be added or edited.
- Existing project-level and Activity validation remains authoritative.
- Invoiced, approved, rejected, locked, or otherwise immutable records are never modified through aggregate edits.
- All writes are workspace- and user-scoped server-side.
- No production deployment in MH1 implementation session.

## Copy Previous Week

MH1 copies row structure only:

- Project
- Task

It does not copy durations, descriptions, tags, Activity, attachments, or billing values.

Rows already present in current week are deduplicated. Since row-only state has no existing persistence table, implementation should prefer client-side row hydration for the active session unless repository inspection reveals an existing safe persistence mechanism. Adding a new table is out of scope.

## Responsive UI

### Desktop

- First column: Project and Task.
- Seven day columns.
- Final row-total column.
- Footer with daily totals and weekly total.
- Sticky row label where practical.

### Mobile

- Week navigation remains at top.
- Each row becomes a compact card.
- Day inputs use a horizontal scroll strip or stacked list based on actual viewport smoke testing.
- No page-level horizontal overflow.

## Integration

Existing page modules remain available:

- active timer
- team day/week timesheet
- detailed historical timesheet
- manual entry form
- PDF export

Weekly Track becomes an additional focused entry mode, not a destructive replacement.

## Error Handling

- Invalid input: inline cell error, no write.
- Immutable-minimum conflict: explain minimum editable total.
- Server validation failure: toast plus restored previous value.
- Network failure: keep cell dirty and allow retry.
- Project/task mismatch: reject server-side.

## Testing

Strict TDD:

1. Unit tests for week boundaries, duration parsing, grouping, totals, and immutable minimum behavior.
2. Wiring tests for page/component/actions integration.
3. Action tests for workspace scope, project/task validation, and protected records where current test infrastructure permits.
4. Full `npm test`.
5. `npm run lint`.
6. `npm run build`.
7. Dev Docker build and browser smoke test at desktop and mobile widths.

## Out of Scope

- Copying previous-week hours.
- Excel import.
- Favorite logs.
- Attachments and expenses per time log.
- Approval workflow.
- Budget and cost hierarchy.
- Report redesign.
- Production deployment.

## Acceptance Criteria

- User can navigate weeks.
- User can add a writable Project/Task row.
- User can enter and revise manual duration in each day.
- Totals update correctly.
- Existing timer history remains intact.
- Protected time cannot be modified.
- Previous-week row structure can be copied without durations.
- Viewer cannot write.
- Desktop and mobile layouts pass browser smoke tests.
- Tests, lint, and build pass.
