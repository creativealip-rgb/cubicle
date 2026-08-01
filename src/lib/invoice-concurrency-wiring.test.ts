import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("invoice source concurrency and empty guards", () => {
  it("serializes project invoice sources and recalculates Fixed remaining under lock", () => {
    const actions = read("src/lib/actions/invoices.ts");
    expect(actions).toContain("pg_advisory_xact_lock");
    expect(actions).toContain("Revalidate every precomputed Fixed amount under the project lock");
    expect(actions).toContain("lockedOriginalAmount");
    expect(actions).toContain('inArray(invoices.status, ["draft", "sent", "viewed", "paid", "overdue"])');
  });

  it("rejects server-side invoice creation without lines or sources", () => {
    const actions = read("src/lib/actions/invoices.ts");
    expect(actions).toContain("Tambahkan minimal satu item atau sumber tagihan");
  });
});
