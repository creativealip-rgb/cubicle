import { describe, expect, it } from "vitest";
import { buildUploadReconcileEvidence, UPLOAD_EVIDENCE_CHECKS } from "./upload-reconcile-evidence";
import { UPLOAD_RECONCILE_CHECKS } from "./upload-reconcile";

const dbReport = {
  version: 1 as const, dryRun: true, scope: "all" as const,
  expectedChecks: [...UPLOAD_RECONCILE_CHECKS], executedChecks: [...UPLOAD_RECONCILE_CHECKS],
  counts: { intents: 2, files: 1, reservations: 1, stalePromoting: 0, expiredActive: 0, pendingWithoutIntent: 0, completedWithPendingFile: 0, activeReservationTerminalIntent: 0, missingFinalFile: 0 },
  actions: { expired: 0, deletedObjects: 0 },
};
const objects = { pages: 2, scanned: 2, missing: [] as string[], orphans: [] as string[], metadataMismatches: [] as string[], deletedObjects: 0 as const };

describe("unified upload reconciliation evidence", () => {
  it("accepts complete exact-scope DB and object evidence", () => {
    const report = buildUploadReconcileEvidence({ dbReport, objects, bucket: "private", prefixes: ["quarantine/", "workspaces/"], referencesScanned: 2 });
    expect(report.complete).toBe(true);
    expect(report.executedChecks).toEqual(UPLOAD_EVIDENCE_CHECKS);
    expect(report.objectScope).toEqual({ bucket: "private", prefixes: ["quarantine/", "workspaces/"], pages: 2, referencesScanned: 2 });
  });

  it("fails closed for partial object scope or destructive result", () => {
    expect(() => buildUploadReconcileEvidence({ dbReport, objects, bucket: "private", prefixes: ["quarantine/"], referencesScanned: 2 })).toThrow("UPLOAD_OBJECT_SCOPE_INCOMPLETE");
    expect(() => buildUploadReconcileEvidence({ dbReport, objects: { ...objects, deletedObjects: 1 as 0 }, bucket: "private", prefixes: ["quarantine/", "workspaces/"], referencesScanned: 2 })).toThrow("UPLOAD_RECONCILE_DELETION_FORBIDDEN");
  });
});
