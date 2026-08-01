import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const runner = readFileSync("scripts/test-postgres-integration.sh", "utf8");

describe("billing-aware Tasks PostgreSQL integration runner", () => {
  it("uses a disposable PostgreSQL 16 clone and always cleans up", () => {
    expect(runner).toContain("SOURCE_DB=${SOURCE_DB:-cubicle_dev}");
    expect(runner).toContain("trap cleanup EXIT");
    expect(runner).toContain("createdb");
    expect(runner).toContain("dropdb");
    expect(runner).toContain("0064_billing_aware_task_templates.sql");
    expect(runner).not.toContain("0062_billing_aware_phase9_cleanup.sql");
  });

  it("covers tenant, atomicity, ordering, delete, and historical Time invariants", () => {
    for (const invariant of [
      "cross_workspace_task_project",
      "cross_workspace_template_item",
      "cross_workspace_assignee",
      "idempotency_same_key",
      "idempotency_changed_fingerprint",
      "rollback_zero_rows",
      "reorder_collision_safe",
      "referenced_task_delete",
      "archive_preserves_time_history",
      "historical_taskless_readable",
      "failed_stop_keeps_timer_active",
    ]) expect(runner).toContain(invariant);
  });
});
