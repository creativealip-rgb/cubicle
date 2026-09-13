import { strict as assert } from "node:assert";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { uploadIntents, uploadQuotaReservations, users, workspaceMembers, workspaces, workspaceStorageUsage } from "../../src/db/schema";
import { claimUploadPromotion, claimValidation, completePromotion, confirmUpload, createUploadIntent, expireUploadIntent, markPromotionFailed, recoverStalePromotion, renewValidationLease, retryFailedPromotion } from "../../src/lib/upload-intent-service";

const suffix = Date.now().toString(36);
const userId = `race-${suffix}`;
let workspaceId = "";

async function main() {
  const [user] = await db.insert(users).values({ id: userId, email: `${userId}@example.invalid`, name: "Race Fixture", plan: "free" }).returning();
  const [workspace] = await db.insert(workspaces).values({ name: "Upload Race Fixture", slug: `upload-race-${suffix}`, ownerId: user.id }).returning();
  workspaceId = workspace.id;
  await db.insert(workspaceMembers).values({ workspaceId, userId, role: "owner" });

  const base = {
    workspaceId,
    actorType: "user" as const,
    actorId: userId,
    destinationType: "workspace_file",
    destinationId: "root",
    expectedMime: "application/pdf",
    expectedBytes: 100,
    maxBytes: 100,
    expectedSha256: "a".repeat(64),
    expiresAt: new Date(Date.now() + 300_000),
  };

  const concurrent = await Promise.all(Array.from({ length: 8 }, () => createUploadIntent({ ...base, idempotencyKey: "same" })));
  assert.equal(new Set(concurrent.map((item) => item.id)).size, 1, "concurrent replay created duplicate intents");
  const [usageAfterCreate] = await db.select().from(workspaceStorageUsage).where(eq(workspaceStorageUsage.workspaceId, workspaceId));
  assert.equal(usageAfterCreate.reservedBytes, 100);
  assert.equal(usageAfterCreate.reservedFiles, 1);

  await assert.rejects(createUploadIntent({ ...base, idempotencyKey: "same", expectedBytes: 99 }), /IDEMPOTENCY_CONFLICT/);

  const intent = concurrent[0];
  const confirmations = await Promise.allSettled([
    confirmUpload(intent.id, workspaceId, intent.version, { etag: "etag-1" }),
    confirmUpload(intent.id, workspaceId, intent.version, { etag: "etag-2" }),
  ]);
  assert.equal(confirmations.filter((result) => result.status === "fulfilled").length, 1, "double confirm succeeded");
  const uploaded = confirmations.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof confirmUpload>>> => result.status === "fulfilled")!.value;
  const validating = await claimValidation(uploaded.id, workspaceId, uploaded.version, "worker-1", new Date(Date.now() + 60_000));
  const claimed = await claimUploadPromotion({ intentId: validating.id, workspaceId, version: validating.version, leaseOwner: "worker-1", leaseExpiresAt: new Date(Date.now() + 60_000), name: "race.pdf", visibility: "internal", fileType: "working_file", uploadedBy: userId });
  const promoting = claimed.intent;
  await assert.rejects(completePromotion(promoting.id, workspaceId, promoting.version, "00000000-0000-0000-0000-000000000000"), /STALE_PROMOTION_ATTEMPT/);

  const completions = await Promise.allSettled([
    completePromotion(promoting.id, workspaceId, promoting.version, promoting.promotionAttemptId!),
    completePromotion(promoting.id, workspaceId, promoting.version, promoting.promotionAttemptId!),
  ]);
  assert.equal(completions.filter((result) => result.status === "fulfilled").length, 1, "double finalize succeeded");
  const [consumed] = await db.select().from(uploadQuotaReservations).where(eq(uploadQuotaReservations.intentId, promoting.id));
  assert.equal(consumed.state, "consumed");
  const [usageAfterComplete] = await db.select().from(workspaceStorageUsage).where(eq(workspaceStorageUsage.workspaceId, workspaceId));
  assert.equal(usageAfterComplete.reservedBytes, 0);
  assert.equal(usageAfterComplete.reservedFiles, 0);

  const expiring = await createUploadIntent({ ...base, idempotencyKey: "expire", expiresAt: new Date(Date.now() + 60_000) });
  await db.update(uploadIntents).set({ expiresAt: new Date(Date.now() - 1_000) }).where(eq(uploadIntents.id, expiring.id));
  const expired = await expireUploadIntent(expiring.id, workspaceId, expiring.version);
  assert.equal(expired.state, "expired");
  await assert.rejects(confirmUpload(expiring.id, workspaceId, expired.version, { etag: "late" }), /UPLOAD_INTENT_CONFLICT/);
  const [released] = await db.select().from(uploadQuotaReservations).where(eq(uploadQuotaReservations.intentId, expiring.id));
  assert.equal(released.state, "released");

  const retryBase = await createUploadIntent({ ...base, idempotencyKey: "retry" });
  const retryUploaded = await confirmUpload(retryBase.id, workspaceId, retryBase.version, { etag: "retry-etag" });
  const retryValidating = await claimValidation(retryUploaded.id, workspaceId, retryUploaded.version, "worker-retry", new Date(Date.now() + 60_000));
  const wrongRenewal = await renewValidationLease(retryValidating.id, workspaceId, retryValidating.version, retryValidating.validationAttemptId!, "wrong-worker", new Date(Date.now() + 90_000));
  assert.equal(wrongRenewal, null, "wrong validation lease owner renewed lease");
  const renewed = await renewValidationLease(retryValidating.id, workspaceId, retryValidating.version, retryValidating.validationAttemptId!, "worker-retry", new Date(Date.now() + 90_000));
  assert.ok(renewed, "correct validation lease owner failed renewal");
  const retryPromoting = await claimUploadPromotion({ intentId: renewed!.id, workspaceId, version: renewed!.version, leaseOwner: "worker-retry", leaseExpiresAt: new Date(Date.now() + 60_000), name: "retry.pdf", visibility: "internal", fileType: "working_file", uploadedBy: userId });
  const failed = await markPromotionFailed(retryPromoting.intent.id, workspaceId, retryPromoting.intent.version, retryPromoting.intent.promotionAttemptId!, "worker-retry", "TEST_FAILURE");
  assert.ok(failed, "promotion failure transition failed");
  const retries = await Promise.allSettled(Array.from({ length: 8 }, () => retryFailedPromotion(failed!.id, workspaceId, failed!.version, "worker-retry-2", new Date(Date.now() + 60_000))));
  assert.equal(retries.filter((result) => result.status === "fulfilled").length, 1, "concurrent failed promotion retry succeeded more than once");

  const staleBase = await createUploadIntent({ ...base, idempotencyKey: "stale" });
  const staleUploaded = await confirmUpload(staleBase.id, workspaceId, staleBase.version, { etag: "stale-etag" });
  const staleValidating = await claimValidation(staleUploaded.id, workspaceId, staleUploaded.version, "worker-stale", new Date(Date.now() + 60_000));
  const staleClaim = await claimUploadPromotion({ intentId: staleValidating.id, workspaceId, version: staleValidating.version, leaseOwner: "worker-stale", leaseExpiresAt: new Date(Date.now() + 60_000), name: "stale.pdf", visibility: "internal", fileType: "working_file", uploadedBy: userId });
  await db.update(uploadIntents).set({ promotionLeaseExpiresAt: new Date(Date.now() - 1_000) }).where(eq(uploadIntents.id, staleClaim.intent.id));
  const recoveries = await Promise.allSettled(Array.from({ length: 8 }, () => recoverStalePromotion(staleClaim.intent.id, workspaceId, staleClaim.intent.version, new Date(Date.now() + 60_000))));
  assert.equal(recoveries.filter((result) => result.status === "fulfilled" && result.value !== null).length, 1, "stale promotion recovered more than once");

  console.log("UPLOAD_INTENT_RACES=PASS concurrent=8 duplicate_intents=0 double_confirm=denied stale_fence=denied double_finalize=denied expiry_release=pass validation_owner_fence=pass failed_retry_race=pass stale_recovery_race=pass");
}

main().finally(async () => {
  if (workspaceId) await db.delete(workspaces).where(eq(workspaces.id, workspaceId)).catch(() => undefined);
  await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
