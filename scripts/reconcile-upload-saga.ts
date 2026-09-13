import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { uploadIntents } from "@/db/schema";
import { R2_BUCKET, R2_CONFIGURED, r2 } from "@/lib/r2";
import { scanUploadObjectInventory } from "@/lib/upload-object-inventory";
import { buildUploadReconcileEvidence } from "@/lib/upload-reconcile-evidence";
import { reconcileUploadIntents } from "@/lib/upload-reconcile";

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_UPLOAD_RECONCILE !== "1") throw new Error("Refusing production apply without ALLOW_PRODUCTION_UPLOAD_RECONCILE=1");
  if (!R2_CONFIGURED) throw new Error("R2 storage is not configured");
  const graceMs = Number(process.env.UPLOAD_RECONCILE_GRACE_MS ?? 86_400_000);
  if (!Number.isSafeInteger(graceMs) || graceMs < 3_600_000) throw new Error("INVALID_UPLOAD_RECONCILE_GRACE");

  const dbReport = await reconcileUploadIntents({ dryRun: !apply });
  const intents = await db.select({
    id: uploadIntents.id, state: uploadIntents.state, quarantineKey: uploadIntents.quarantineKey,
    finalKey: uploadIntents.finalKey, attemptId: uploadIntents.promotionAttemptId,
    expectedBytes: uploadIntents.expectedBytes, expectedMime: uploadIntents.expectedMime,
  }).from(uploadIntents).where(inArray(uploadIntents.state, ["uploaded", "validating", "promoting", "promotion_failed", "completed"]));
  const references = intents.flatMap((intent) => {
    const common = { intentId: intent.id, attemptId: intent.attemptId, expectedBytes: intent.expectedBytes, expectedMime: intent.expectedMime };
    if (["uploaded", "validating"].includes(intent.state)) return [{ ...common, key: intent.quarantineKey, requireMetadata: false }];
    if (["promoting", "promotion_failed"].includes(intent.state)) return [
      { ...common, key: intent.quarantineKey, requireMetadata: false },
      { ...common, key: intent.finalKey, requireMetadata: true },
    ];
    return [{ ...common, key: intent.finalKey, requireMetadata: true }];
  });
  const objects = await scanUploadObjectInventory(r2, { bucket: R2_BUCKET, now: new Date(), graceMs, references });
  const evidence = buildUploadReconcileEvidence({ dbReport, objects, bucket: R2_BUCKET, prefixes: ["quarantine/", "workspaces/"], referencesScanned: references.length });
  console.log(JSON.stringify(evidence, null, 2));
  const dbFindings = Object.entries(dbReport.counts).filter(([key, value]) => !["intents", "files", "reservations"].includes(key) && value > 0);
  if (dbFindings.length || objects.missing.length || objects.orphans.length || objects.metadataMismatches.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
