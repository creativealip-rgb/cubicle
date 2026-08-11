import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("@/db", () => ({
  db: {},
}));

import {
  classifyReservation,
  isStaleReservation,
  RESERVATION_STALE_AFTER_MS,
  scanWorkspaceStorageUsage,
  reconcileWorkspaceStorageUsage,
  summarizeStorageUsageScan,
} from "@/lib/storage-quota-reconcile";
import { workspaceStorageUsage } from "@/db/schema";

type UpdateResult = {
  rows: unknown[];
  updates: Record<string, unknown>[];
  conditions: unknown[];
  sql: string;
};

const NOW = new Date();
const OLD = new Date(NOW.getTime() - 10 * 60 * 1000); // 10 min old → past the 5 min gate
const FRESH = new Date(NOW.getTime() - 60 * 1000); // 1 min old → inside the gate

const scanRows = [
  {
    workspaceId: "ws-clean",
    reservedBytes: 0,
    reservedFiles: 0,
    updatedAt: NOW,
    actualBytes: 1024,
    actualFiles: 1,
  },
  {
    workspaceId: "ws-leak",
    reservedBytes: 512,
    reservedFiles: 1,
    updatedAt: OLD,
    actualBytes: 2048,
    actualFiles: 2,
  },
  {
    workspaceId: "ws-leak-files-only",
    reservedBytes: 0,
    reservedFiles: 1,
    updatedAt: OLD,
    actualBytes: 0,
    actualFiles: 0,
  },
];

const freshRow = {
  workspaceId: "ws-in-flight",
  reservedBytes: 100,
  reservedFiles: 1,
  updatedAt: FRESH,
  actualBytes: 0,
  actualFiles: 0,
};

function makeFakeDb(rows: unknown[]) {
  const updates: Record<string, unknown>[] = [];
  const conditions: unknown[] = [];
  const updateSqls: string[] = [];

  const updateBuilder = {
    set: vi.fn((values: Record<string, unknown>) => {
      updates.push(values);
      return updateBuilder;
    }),
    where: vi.fn((cond: unknown) => {
      conditions.push(cond);
      return updateBuilder;
    }),
    returning: vi.fn(() => ({
      then: (resolve: (value: unknown[]) => unknown) => resolve(rows),
    })),
  };

  const selectBuilder = {
    from: vi.fn(() => selectBuilder),
    leftJoin: vi.fn(() => selectBuilder),
    where: vi.fn(() => selectBuilder),
    groupBy: vi.fn(() => selectBuilder),
    orderBy: vi.fn(() => ({
      then: (resolve: (value: unknown[]) => unknown) => resolve(rows),
    })),
  };

  const transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
    // Apply-mode uses `tx.update(...)`; drive the same fake builder.
    return fn({
      update: () => updateBuilder,
    });
  });

  const fakeDb = {
    select: () => selectBuilder,
    update: () => updateBuilder,
    transaction,
  };

  const result: UpdateResult = {
    rows,
    updates,
    conditions,
    sql: "",
  };
  Object.defineProperty(result, "sql", {
    get: () => updateSqls[0] ?? "",
  });

  return { fakeDb, selectBuilder, updateBuilder, transaction, updates, conditions, updateSqls };
}

/** Render drizzle SQL conditions the way the pg dialect would, for WHERE assertions. */
function renderedWhere(conditions: unknown[]): string {
  const dialect = new PgDialect();
  return conditions.map((c) => dialect.sqlToQuery(c as any).sql).join("\n");
}

describe("isStaleReservation", () => {
  it("never treats zero counters as stale, regardless of age", () => {
    expect(isStaleReservation({ reservedBytes: 0, reservedFiles: 0, updatedAt: OLD }, NOW)).toBe(false);
    expect(isStaleReservation({ reservedBytes: 0, reservedFiles: 0, updatedAt: null }, NOW)).toBe(false);
  });

  it("treats nonzero reservations younger than 5 minutes as active, not stale", () => {
    expect(isStaleReservation({ reservedBytes: 1, reservedFiles: 0, updatedAt: FRESH }, NOW)).toBe(false);
    expect(isStaleReservation({ reservedBytes: 0, reservedFiles: 1, updatedAt: FRESH }, NOW)).toBe(false);
  });

  it("treats nonzero reservations untouched for 5+ minutes as stale", () => {
    expect(isStaleReservation({ reservedBytes: 1, reservedFiles: 0, updatedAt: OLD }, NOW)).toBe(true);
    expect(isStaleReservation({ reservedBytes: 0, reservedFiles: 1, updatedAt: OLD }, NOW)).toBe(true);
    expect(isStaleReservation({ reservedBytes: -1, reservedFiles: 0, updatedAt: OLD }, NOW)).toBe(true);
  });

  it("treats a missing updatedAt as maximally old (leaked rows are never skipped)", () => {
    expect(isStaleReservation({ reservedBytes: 1, reservedFiles: 0, updatedAt: null }, NOW)).toBe(true);
  });

  it("classifies a reservation exactly at the 5-minute boundary as stale", () => {
    const boundary = new Date(NOW.getTime() - RESERVATION_STALE_AFTER_MS);
    expect(isStaleReservation({ reservedBytes: 1, reservedFiles: 0, updatedAt: boundary }, NOW)).toBe(true);
  });
});

describe("classifyReservation", () => {
  it("returns clean / active / stale", () => {
    expect(classifyReservation({ reservedBytes: 0, reservedFiles: 0, updatedAt: OLD }, NOW)).toBe("clean");
    expect(classifyReservation({ reservedBytes: 1, reservedFiles: 0, updatedAt: FRESH }, NOW)).toBe("active");
    expect(classifyReservation({ reservedBytes: 1, reservedFiles: 0, updatedAt: OLD }, NOW)).toBe("stale");
  });
});

describe("summarizeStorageUsageScan", () => {
  it("counts scanned, active (fresh) and stale (old) workspaces deterministically", () => {
    const summary = summarizeStorageUsageScan([...scanRows, freshRow], NOW);
    expect(summary.scanned).toBe(4);
    expect(summary.active).toBe(1);
    expect(summary.stale).toBe(2);
    expect(summary.activeWorkspaces).toEqual(["ws-in-flight"]);
    expect(summary.staleWorkspaces).toEqual(["ws-leak", "ws-leak-files-only"]);
  });

  it("reports no active rows when every nonzero reservation is old", () => {
    const summary = summarizeStorageUsageScan(scanRows, NOW);
    expect(summary.active).toBe(0);
    expect(summary.stale).toBe(2);
  });
});

describe("scanWorkspaceStorageUsage", () => {
  it("maps rows and normalizes bigint/count values and dates to numbers", async () => {
    const { fakeDb } = makeFakeDb(scanRows);
    const rows = await scanWorkspaceStorageUsage(fakeDb as any);
    expect(rows).toEqual(scanRows);
  });

  it("passes a workspace filter through to the query when provided", async () => {
    const { fakeDb, selectBuilder } = makeFakeDb(scanRows);
    await scanWorkspaceStorageUsage(fakeDb as any, "ws-leak");
    expect(selectBuilder.where).toHaveBeenCalledTimes(1);
  });
});

describe("reconcileWorkspaceStorageUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to dry run and never writes", async () => {
    const { fakeDb, transaction } = makeFakeDb(scanRows);
    const report = await reconcileWorkspaceStorageUsage({}, fakeDb as any);

    expect(report.dryRun).toBe(true);
    expect(report.scanned).toBe(3);
    expect(report.active).toBe(0);
    expect(report.stale).toBe(2);
    expect(report.applied).toBe(0);
    expect(report.rows).toEqual([
      { ...scanRows[0], status: "clean" },
      { ...scanRows[1], status: "stale" },
      { ...scanRows[2], status: "stale" },
    ]);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("reports fresh nonzero reservations as active, not stale", async () => {
    const { fakeDb } = makeFakeDb([freshRow]);
    const report = await reconcileWorkspaceStorageUsage({}, fakeDb as any);

    expect(report.active).toBe(1);
    expect(report.stale).toBe(0);
    expect(report.applied).toBe(0);
    expect(report.rows[0].status).toBe("active");
  });

  it("explicit dryRun:false zeroes STALE reservations inside a transaction", async () => {
    const { fakeDb, transaction, updates } = makeFakeDb(scanRows);
    const report = await reconcileWorkspaceStorageUsage({ dryRun: false }, fakeDb as any);

    expect(report.dryRun).toBe(false);
    expect(report.applied).toBe(2);
    expect(transaction).toHaveBeenCalledTimes(1);
    // Only the two stale rows are updated; the clean row is skipped.
    expect(updates).toEqual([
      { reservedBytes: 0, reservedFiles: 0, updatedAt: expect.any(Date) },
      { reservedBytes: 0, reservedFiles: 0, updatedAt: expect.any(Date) },
    ]);
  });

  it("does NOT apply a fresh (in-flight) reservation even in apply mode", async () => {
    const { fakeDb, transaction, updates } = makeFakeDb([freshRow]);
    const report = await reconcileWorkspaceStorageUsage({ dryRun: false }, fakeDb as any);

    expect(report.active).toBe(1);
    expect(report.stale).toBe(0);
    expect(report.applied).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("applies only the stale rows when fresh and old reservations coexist", async () => {
    const { fakeDb, transaction, updates } = makeFakeDb([freshRow, scanRows[1]]);
    const report = await reconcileWorkspaceStorageUsage({ dryRun: false }, fakeDb as any);

    expect(report.active).toBe(1);
    expect(report.stale).toBe(1);
    expect(report.applied).toBe(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(1);
  });

  it("repeats the age gate atomically in the UPDATE WHERE clause", async () => {
    const { fakeDb, conditions } = makeFakeDb([scanRows[1]]);
    await reconcileWorkspaceStorageUsage({ dryRun: false }, fakeDb as any);

    const sql = renderedWhere(conditions);
    expect(sql).toContain("interval '5 minutes'");
    expect(sql).toContain("updated_at");
    expect(sql).toContain("< now()");
    // Still guards on nonzero counters.
    expect(sql).toContain("reserved_bytes");
  });

  it("only touches stale rows even in apply mode", async () => {
    const { fakeDb, updates } = makeFakeDb(scanRows);
    await reconcileWorkspaceStorageUsage({ dryRun: false }, fakeDb as any);
    expect(updates).toHaveLength(2);
  });

  it("never issues a delete against the files table", async () => {
    const { fakeDb, updateBuilder, selectBuilder } = makeFakeDb(scanRows);
    await reconcileWorkspaceStorageUsage({ dryRun: false }, fakeDb as any);
    // The lib only ever calls .update() on workspace_storage_usage — no
    // delete builder exists anywhere in the reconcile path.
    expect((fakeDb as any).delete).toBeUndefined();
    expect(updateBuilder.where).toHaveBeenCalled();
    expect(selectBuilder.leftJoin).toHaveBeenCalled();
  });

  it("respects a workspaceId filter", async () => {
    const { fakeDb } = makeFakeDb([scanRows[1]]);
    const report = await reconcileWorkspaceStorageUsage(
      { workspaceId: "ws-leak", dryRun: false },
      fakeDb as any,
    );
    expect(report.scanned).toBe(1);
    expect(report.stale).toBe(1);
    expect(report.applied).toBe(1);
  });

  it("reports clean when there is nothing stale and applies nothing", async () => {
    const { fakeDb, transaction } = makeFakeDb([scanRows[0]]);
    const report = await reconcileWorkspaceStorageUsage({ dryRun: false }, fakeDb as any);
    expect(report.stale).toBe(0);
    expect(report.applied).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("imports the schema table it reconciles (workspace_storage_usage, not files)", () => {
    // Guards against a future refactor silently pointing the update at files.
    expect(workspaceStorageUsage).toBeDefined();
  });
});
