import { describe, expect, it } from "vitest";
import { UPLOAD_RECONCILE_CHECKS, validateUploadReconcileReport } from "./upload-reconcile";

const base = {
  version: 1 as const,
  dryRun: true,
  scope: "all" as const,
  expectedChecks: [] as string[],
  executedChecks: [] as string[],
  counts: { intents: 0, files: 0, reservations: 0, stalePromoting: 0, expiredActive: 0, pendingWithoutIntent: 0, completedWithPendingFile: 0, activeReservationTerminalIntent: 0, missingFinalFile: 0 },
  actions: { expired: 0, deletedObjects: 0 },
};

describe("upload reconciliation report gate", () => {
  it("accepts only complete versioned check execution", () => {
    expect(validateUploadReconcileReport({ ...base, expectedChecks: [...UPLOAD_RECONCILE_CHECKS], executedChecks: [...UPLOAD_RECONCILE_CHECKS] })).toBe(true);
  });
  it("fails closed on missing, unknown, duplicate, or partial checks", () => {
    expect(validateUploadReconcileReport({ ...base, expectedChecks: [...UPLOAD_RECONCILE_CHECKS], executedChecks: UPLOAD_RECONCILE_CHECKS.slice(1) })).toBe(false);
    expect(validateUploadReconcileReport({ ...base, expectedChecks: [...UPLOAD_RECONCILE_CHECKS], executedChecks: [...UPLOAD_RECONCILE_CHECKS, "unknown"] })).toBe(false);
    expect(validateUploadReconcileReport({ ...base, expectedChecks: [...UPLOAD_RECONCILE_CHECKS], executedChecks: [...UPLOAD_RECONCILE_CHECKS, UPLOAD_RECONCILE_CHECKS[0]] })).toBe(false);
  });
});
