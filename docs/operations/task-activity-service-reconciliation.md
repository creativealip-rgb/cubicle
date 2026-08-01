# Task, Activity, and Service Reconciliation

## Current canonical behavior

- Project work uses flat Tasks.
- Fixed Price defaults to workflow Tasks.
- Hourly and Retainer default to active reusable Tasks.
- New Hourly/Retainer Time entries require an eligible Task.
- Reports aggregate Time by client, project, Task, and member.
- Historical Time entries without a Task remain counted as `Tanpa tugas`.
- Task Template imports create independent flat project Tasks.

## Compatibility boundary

Activity and Service active UI is retired, but compatibility storage and reads remain. Do not drop:

- `activities`
- `project_activities`
- `services`
- `project_services`
- `time_entries.activity_id`

Migration `0062_billing_aware_phase9_cleanup.sql` is retired and unauthorized to run.

## Required production reconciliation before destructive cleanup

1. Create fresh production backup and checksum.
2. Restore backup into disposable PostgreSQL 16.
3. Count Activity, Project Activity, Service, Project Service, and Activity-linked Time rows.
4. Identify invoice/report/document dependencies.
5. Prove current application reads all historical Time rows after proposed cleanup.
6. Prepare rollback and restore procedure.
7. Obtain separate explicit production cleanup approval.

This document does not authorize schema deletion or production migration.
