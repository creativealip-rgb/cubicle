import { describe, expect, it } from "vitest";
import { assertDisposableDatabaseUrl } from "../../scripts/invoice-concurrency-safety";

describe("invoice concurrency harness database safety", () => {
  it.each([
    "postgres://localhost/cubicle",
    "postgres://localhost/cubicle_dev",
    "postgres://localhost/cubicle_prod",
    "postgres://localhost/cubicle_test_backup",
    "postgres://localhost/other_test",
  ])("rejects unsafe database URL %s", (url) => {
    expect(() => assertDisposableDatabaseUrl(url)).toThrow(/Refusing unsafe DATABASE_URL/);
  });

  it.each([
    "postgres://localhost/cubicle_invoice_test",
    "postgres://localhost/cubicle_invoice_qa",
    "postgres://localhost/cubicle_test",
  ])("accepts explicit Cubiqlo disposable database URL %s", (url) => {
    expect(assertDisposableDatabaseUrl(url).pathname.slice(1)).toMatch(/^cubicle_.*(?:test|qa)$/);
  });

  it("requires an explicit URL", () => {
    expect(() => assertDisposableDatabaseUrl(undefined)).toThrow("DATABASE_URL is required");
  });
});
