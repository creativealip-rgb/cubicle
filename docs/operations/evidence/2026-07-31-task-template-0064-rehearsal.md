# Migration 0064 Disposable PostgreSQL Rehearsal Evidence

**Date:** 2026-07-31

**Migration:** `drizzle/0064_billing_aware_task_templates.sql`

**Source:** `cubicle_dev` copied with `pg_dump -Fc` and restored into disposable PostgreSQL 16.14 database.

**Safety:** Production database `cubicle` was not accessed. No development sessions were terminated. Retired migration `0062_billing_aware_phase9_cleanup.sql` was not executed.

## Procedure

1. Dump `cubicle_dev` from `cubiqlo-new-pg` with `pg_dump -Fc`.
2. Restore into disposable database `rehearsal_0064_quality_1785508835`.
3. Apply `0064_billing_aware_task_templates.sql` twice with `ON_ERROR_STOP=1`.
4. Probe generated normalization, blank checks, same-workspace provenance, item deletion, and cross-tenant rejection.
5. Drop disposable database and dump.

## Observed replay output

First apply:

```text
UPDATE 103
NOTICE: 0064 task mode reconciliation: workflow=76, reusable=27
```

Second apply:

```text
NOTICE: column "task_mode_policy" of relation "projects" already exists, skipping
NOTICE: column "mode" of relation "tasks" already exists, skipping
NOTICE: column "lifecycle" of relation "tasks" already exists, skipping
NOTICE: column "template_item_source_id" of relation "tasks" already exists, skipping
NOTICE: relation "task_templates" already exists, skipping
NOTICE: relation "task_templates_workspace_active_normalized_name_uidx" already exists, skipping
NOTICE: relation "task_template_items" already exists, skipping
NOTICE: relation "task_template_imports" already exists, skipping
UPDATE 0
NOTICE: 0064 task mode reconciliation: workflow=76, reusable=27
NOTICE: relation "tasks_workspace_mode_lifecycle_idx" already exists, skipping
NOTICE: relation "tasks_project_mode_lifecycle_position_idx" already exists, skipping
NOTICE: relation "task_template_imports_workspace_project_created_idx" already exists, skipping
```

Both applies exited `0`. Guarded `ADD CONSTRAINT` statements did not recreate existing constraints.

## Integrity probes

```text
NOTICE: normalized_name=mixed case template
NOTICE: same_workspace_provenance=accepted
NOTICE: delete_probe=template_item_source_id:null,workspace_id:intact
NOTICE: cross_tenant_template_item=rejected
NOTICE: cross_tenant_task_linkage=rejected
NOTICE: blank_template_name=rejected
NOTICE: blank_item_title=rejected
DO
```

Only composite provenance FK remains and validates:

```text
tasks_template_item_source_workspace_fk=true
```

PostgreSQL 16 accepted `ON DELETE SET NULL ("template_item_source_id")` on composite FK. Deleting source item cleared nullable provenance column while preserving non-null `workspace_id`.

## Cleanup

```text
dropped=rehearsal_0064_quality_1785508835
```
