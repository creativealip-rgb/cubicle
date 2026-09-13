import { strict as assert } from "node:assert";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { uploadIntents, uploadQuotaReservations, users, workspaceMembers, workspaces, workspaceStorageUsage } from "../../src/db/schema";
import { claimUploadPromotion, claimValidation, completePromotion, confirmUpload, createUploadIntent, expireUploadIntent } from "../../src/lib/upload-intent-service";

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
  const validating = await claimValidation(uploaded.id, workspaceId, uploaded.version);
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

  console.log("UPLOAD_INTENT_RACES=PASS concurrent=8 duplicate_intents=0 double_confirm=denied stale_fence=denied double_finalize=denied expiry_release=pass quota_reserved=0");
}

main().finally(async () => {
  if (workspaceId) await db.delete(workspaces).where(eq(workspaces.id, workspaceId)).catch(() => undefined);
  await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
