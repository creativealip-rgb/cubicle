# Migration 0064 Disposable PostgreSQL Rehearsal Evidence

**Date:** 2026-07-31  
**Migration:** `drizzle/0064_billing_aware_task_templates.sql`  
**Source:** `cubicle_dev` copied with `pg_dump -Fc` and restored into disposable PostgreSQL 16 database.  
**Safety:** Production database `cubicle` was not accessed. Retired migration `0062_billing_aware_phase9_cleanup.sql` was not executed.

## Procedure

1. `pg_dump -Fc` from `cubicle_dev` inside `cubiqlo-new-pg`.
2. Create disposable database `rehearsal_0064_1785508324`.
3. Restore dump into disposable database.
4. Apply only `0064_billing_aware_task_templates.sql` with `ON_ERROR_STOP=1`.
5. Query tables, task backfill, tenant/provenance constraints, and import-ledger rollback.
6. Drop disposable database and dump.

Direct `CREATE DATABASE ... TEMPLATE cubicle_dev` was attempted first but PostgreSQL rejected it because one active development connection existed. No connection was terminated; dump/restore was used instead.

## Observed migration output

```text
UPDATE 103
NOTICE: 0064 task mode reconciliation: workflow=76, reusable=27
```

## Tables

```text
task_template_imports
task_template_items
task_templates
```

## Backfill

```text
reusable|27
workflow|76
null_modes=0
```

Legacy/unclassified rows use the migration's conservative workflow fallback. No historical Time Log relationship was rewritten.

## Validated constraints

```text
projects_id_workspace_unique=true
task_template_imports_project_workspace_fk=true
task_template_items_assignee_workspace_fk=true
task_template_items_template_workspace_fk=true
tasks_project_workspace_fk=true
tasks_template_item_source_fk=true
tasks_template_item_source_workspace_fk=true
```

## Import-ledger rollback probe

Inside one transaction, one ledger row was inserted using an existing disposable project, then rolled back.

```text
BEGIN
INSERT 0 1
ROLLBACK
probe_rows=0
```

This proves a failed transaction does not leave the probe ledger row. Retry/conflict behavior remains action-layer scope and is tested when import actions are implemented.

## Cleanup

```text
dropped=rehearsal_0064_1785508324
```
