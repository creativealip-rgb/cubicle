import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "drizzle/0083_personal_productivity_contract.sql",
  "utf8",
);
const schema = readFileSync("src/db/schema.ts", "utf8");

const tables = [
  "personal_goals",
  "personal_goal_steps",
  "personal_habits",
  "personal_habit_checkins",
  "personal_transaction_categories",
  "personal_transactions",
  "personal_budgets",
];
const objects = [
  "personal_goals_user_fk",
  "personal_habits_schedule_ck",
  "personal_categories_user_name_idx",
  "personal_transactions_receipt_metadata_ck",
  "personal_budgets_percent_total_ck",
];

describe("personal productivity Phase 0A schema contract", () => {
  it("reserves migration 0083 with timezone backfill and seven tables", () => {
    expect(migration).toContain("ADD COLUMN timezone");
    expect(migration).toContain("ORDER BY w.created_at ASC, w.id ASC");
    for (const table of tables)
      expect(migration).toContain(`CREATE TABLE ${table}`);
  });

  it("keeps SQL and Drizzle named-object parity", () => {
    for (const name of objects) {
      expect(migration).toContain(name);
      expect(schema).toContain(name);
    }
    for (const table of tables)
      expect(schema).toMatch(new RegExp(`pgTable\\(\\s*\\"${table}\\"`));
  });
});
