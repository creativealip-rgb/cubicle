import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("availability rule duplicate guard", () => {
  it("enforces exact slot uniqueness in schema and migration", () => {
    const schema = read("src/db/schema.ts");
    const migration = read("drizzle/0105_availability_rule_uniqueness.sql");
    expect(schema).toContain("availability_rules_exact_slot_unique");
    expect(migration).toContain("PARTITION BY workspace_id, day_of_week, start_time, end_time, timezone");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS availability_rules_exact_slot_unique");
  });

  it("returns duplicate creation as typed domain feedback", () => {
    const action = read("src/lib/actions/appointments.ts");
    expect(action).toContain("error: tAvailabilityDuplicate");
    expect(action).not.toContain("throw new Error(`AVAILABILITY_RULE_DUPLICATE");
  });

  it("renders duplicate rejection as normal UI feedback", () => {
    const form = read("src/components/calendar/availability-rule-form.tsx");
    expect(form).toContain("if (!result.ok)");
    expect(form).toContain("toast.error(result.error)");
  });
});
