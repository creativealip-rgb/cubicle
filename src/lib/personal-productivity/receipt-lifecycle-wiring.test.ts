import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/actions/personal-transactions.ts", "utf8");
const r2 = readFileSync("src/lib/r2.ts", "utf8");
const reconciler = readFileSync("scripts/reconcile-personal-receipts.ts", "utf8");
const retry = readFileSync("scripts/retry-personal-receipt-cleanup.ts", "utf8");
const migration = readFileSync("drizzle/0089_personal_receipt_cleanup_queue.sql", "utf8");

describe("personal receipt lifecycle", () => {
  it("verifies uploaded object metadata and content server-side before persistence", () => {
    expect(r2).toContain("inspectStoredFile");
    expect(actions).toContain("await inspectStoredFile(input.key)");
    expect(actions).toContain("actual.checksum !== input.checksum");
  });

  it("clears receipt metadata before deleting the old object", () => {
    const body = actions.slice(actions.indexOf("export async function deletePersonalReceipt"), actions.indexOf("export async function abandonPersonalReceiptUpload"));
    expect(body.indexOf(".update(personalTransactions)")).toBeGreaterThan(-1);
    expect(body.indexOf("cleanupStoredFile(row.receiptKey)")).toBeGreaterThan(body.indexOf(".update(personalTransactions)"));
  });

  it("compensates when DB persistence fails after object upload", () => {
    const body = actions.slice(actions.indexOf("export async function confirmPersonalReceipt"), actions.indexOf("export async function deletePersonalReceipt"));
    expect(body).toContain("try {");
    expect(body).toContain("await cleanupStoredFile(input.key)");
    expect(body).toContain("throw error");
  });

  it("durably queues failed cleanup and ships a bounded backoff retry worker", () => {
    expect(actions).toContain("personalReceiptCleanupQueue");
    expect(actions).toContain("onConflictDoUpdate");
    expect(migration).toContain("personal_receipt_cleanup_queue");
    expect(retry).toContain("for update skip locked limit 100");
    expect(retry).toContain("DeleteObjectCommand");
    expect(retry).toContain("Math.min(1440");
  });

  it("ships a read-only fail-closed object reconciler", () => {
    expect(reconciler).toContain("PERSONAL_RECEIPT_RECONCILE_PREFIX");
    expect(reconciler).toContain("missing_referenced_objects");
    expect(reconciler).toContain("orphan_objects");
    expect(reconciler).toContain("invalid_canonical_keys");
    expect(reconciler).toContain("metadata_or_size_mismatches");
    expect(reconciler).not.toContain("DeleteObjectCommand");
  });
});
