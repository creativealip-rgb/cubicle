export const UPLOAD_INTENT_STATES = [
  "reserved",
  "uploaded",
  "validating",
  "promoting",
  "promotion_failed",
  "completed",
  "aborted",
  "expired",
  "quarantined",
  "failed_cleanup",
] as const;

export type UploadIntentState = (typeof UPLOAD_INTENT_STATES)[number];

const transitions: Readonly<Record<UploadIntentState, readonly UploadIntentState[]>> = {
  reserved: ["uploaded", "aborted", "expired", "failed_cleanup"],
  uploaded: ["validating", "aborted", "expired", "quarantined", "failed_cleanup"],
  validating: ["promoting", "quarantined", "aborted", "failed_cleanup"],
  promoting: ["completed", "promotion_failed", "failed_cleanup"],
  promotion_failed: ["promoting", "failed_cleanup"],
  completed: ["failed_cleanup"],
  aborted: ["failed_cleanup"],
  expired: ["failed_cleanup"],
  quarantined: ["failed_cleanup"],
  failed_cleanup: [],
};

export function canTransitionUploadIntent(from: UploadIntentState, to: UploadIntentState) {
  return transitions[from].includes(to);
}

export function assertUploadIntentTransition(from: UploadIntentState, to: UploadIntentState) {
  if (!canTransitionUploadIntent(from, to)) throw new Error(`Invalid upload intent transition: ${from} -> ${to}`);
}

export function isCurrentPromotionAttempt(currentAttemptId: string | null, suppliedAttemptId: string) {
  return currentAttemptId !== null && currentAttemptId === suppliedAttemptId;
}
