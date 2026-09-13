import { r2, R2_BUCKET } from "@/lib/r2";
import { claimUploadPromotion, completePromotion, markPromotionFailed } from "@/lib/upload-intent-service";
import { promoteValidatedUploadObject } from "@/lib/upload-object-promotion";

type Input = {
  intentId: string; workspaceId: string; version: number; workerId: string;
  name: string; visibility: "internal" | "client";
  fileType: "working_file" | "deliverable"; uploadedBy?: string;
};

export async function runUploadPromotionSaga(input: Input) {
  const claimed = await claimUploadPromotion({ ...input, leaseOwner: input.workerId, leaseExpiresAt: new Date(Date.now() + 60_000) });
  const intent = claimed.intent;
  try {
    const object = await promoteValidatedUploadObject(r2, {
      bucket: R2_BUCKET, intentId: intent.id, attemptId: intent.promotionAttemptId!,
      quarantineKey: intent.quarantineKey, finalKey: intent.finalKey,
      expectedBytes: intent.expectedBytes, maxBytes: intent.maxBytes,
      expectedMime: intent.expectedMime, expectedSha256: intent.expectedSha256,
    });
    const completed = await completePromotion(intent.id, intent.workspaceId, intent.version, intent.promotionAttemptId!);
    return { intent: completed, file: { ...claimed.file, uploadState: "completed" as const }, object };
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "PROMOTION_FAILED";
    await markPromotionFailed(intent.id, intent.workspaceId, intent.version, intent.promotionAttemptId!, input.workerId, code);
    throw error;
  }
}
