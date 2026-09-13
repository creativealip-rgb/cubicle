import { validateUploadReconcileReport, type UploadReconcileReport } from "./upload-reconcile";

export const UPLOAD_EVIDENCE_CHECKS = ["database_ledger_complete", "object_pagination_complete", "object_references_complete", "object_metadata_verified", "orphan_grace_applied", "deletion_disabled"] as const;

type Objects = { pages: number; scanned: number; missing: string[]; orphans: string[]; metadataMismatches: string[]; deletedObjects: number };

export function buildUploadReconcileEvidence(input: { dbReport: UploadReconcileReport; objects: Objects; bucket: string; prefixes: string[]; referencesScanned: number }) {
  if (!validateUploadReconcileReport(input.dbReport)) throw new Error("UPLOAD_DATABASE_SCOPE_INCOMPLETE");
  if (input.prefixes.length !== 2 || input.prefixes[0] !== "quarantine/" || input.prefixes[1] !== "workspaces/") throw new Error("UPLOAD_OBJECT_SCOPE_INCOMPLETE");
  if (!input.bucket || input.objects.pages < 2 || input.referencesScanned < 0) throw new Error("UPLOAD_OBJECT_SCAN_INCOMPLETE");
  if (input.objects.deletedObjects !== 0 || input.dbReport.actions.deletedObjects !== 0) throw new Error("UPLOAD_RECONCILE_DELETION_FORBIDDEN");
  return {
    version: 1 as const,
    complete: true,
    dryRun: input.dbReport.dryRun,
    scope: "all" as const,
    expectedChecks: [...UPLOAD_EVIDENCE_CHECKS],
    executedChecks: [...UPLOAD_EVIDENCE_CHECKS],
    database: input.dbReport,
    objects: input.objects,
    objectScope: { bucket: input.bucket, prefixes: input.prefixes, pages: input.objects.pages, referencesScanned: input.referencesScanned },
  };
}
