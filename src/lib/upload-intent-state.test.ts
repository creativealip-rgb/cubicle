import { describe, expect, it } from "vitest";
import { assertUploadIntentTransition, canTransitionUploadIntent, isCurrentPromotionAttempt, UPLOAD_INTENT_STATES } from "./upload-intent-state";

describe("upload intent state machine", () => {
  it("permits canonical saga progress and bounded promotion retry", () => {
    expect(canTransitionUploadIntent("reserved", "uploaded")).toBe(true);
    expect(canTransitionUploadIntent("uploaded", "validating")).toBe(true);
    expect(canTransitionUploadIntent("validating", "promoting")).toBe(true);
    expect(canTransitionUploadIntent("promoting", "completed")).toBe(true);
    expect(canTransitionUploadIntent("promoting", "promotion_failed")).toBe(true);
    expect(canTransitionUploadIntent("promotion_failed", "promoting")).toBe(true);
  });

  it("rejects visibility shortcuts and terminal resurrection", () => {
    expect(canTransitionUploadIntent("reserved", "completed")).toBe(false);
    expect(canTransitionUploadIntent("uploaded", "completed")).toBe(false);
    expect(canTransitionUploadIntent("quarantined", "promoting")).toBe(false);
    expect(canTransitionUploadIntent("aborted", "reserved")).toBe(false);
    expect(canTransitionUploadIntent("expired", "uploaded")).toBe(false);
    expect(() => assertUploadIntentTransition("completed", "promoting")).toThrow("Invalid upload intent transition");
  });

  it("accepts only the current promotion fencing token", () => {
    expect(isCurrentPromotionAttempt("attempt-2", "attempt-2")).toBe(true);
    expect(isCurrentPromotionAttempt("attempt-2", "attempt-1")).toBe(false);
    expect(isCurrentPromotionAttempt(null, "attempt-1")).toBe(false);
  });

  it("keeps the persisted state list stable", () => {
    expect(UPLOAD_INTENT_STATES).toHaveLength(10);
  });
});
