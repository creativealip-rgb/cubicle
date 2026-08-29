import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runner = readFileSync("scripts/test-invoice-finance-concurrency.sh", "utf8");

describe("invoice finance PostgreSQL concurrency runner", () => {
  it("uses a disposable clone and cleans it up", () => {
    expect(runner).toContain("SOURCE_DB=${SOURCE_DB:-cubicle_dev}");
    expect(runner).toContain("trap cleanup EXIT");
    expect(runner).toContain("createdb");
    expect(runner).toContain("dropdb");
  });

  it.each([
    "concurrent_payment_no_overpay",
    "payment_void_serialized",
    "time_edit_import_serialized",
    "duplicate_time_import_rejected",
    "concurrent_item_total_consistent",
  ])("proves %s", (invariant) => expect(runner).toContain(invariant));
});
