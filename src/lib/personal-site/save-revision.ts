/**
 * Stale-tab protection for personal-site saves.
 *
 * `personal_sites.updated_at` is the revision token: every write stamps it with
 * `new Date()`, so it changes on every save and is safe to round-trip through
 * the client as an opaque ISO string. An update may only apply while the row is
 * still at the revision the editor loaded — otherwise a second tab/session
 * silently overwrites the first (last-write-wins data loss).
 *
 * A conflict is terminal and never merged: the two documents are JSON blobs
 * with no semantic merge, so the editor must choose Reload (discard local) or
 * an explicit Keep-local force save.
 */
export type SaveConflictResolution = "ok" | "conflict";

/** Sentinel message classified as terminal (never retried) by the autosave hook. */
export const STALE_REVISION_MESSAGE = "PERSONAL_SITE_STALE_REVISION";

export function resolveSaveConflict(
  expectedRevision: Date | string | null | undefined,
  currentRevision: Date | string | null | undefined,
): SaveConflictResolution {
  // No loaded revision (first-ever save) => nothing to compare against.
  if (expectedRevision === null || expectedRevision === undefined) return "ok";
  // Expected a revision but the row is gone => the editor is stale.
  if (currentRevision === null || currentRevision === undefined) return "conflict";
  const expected = new Date(expectedRevision).getTime();
  const current = new Date(currentRevision).getTime();
  // Unparsable revision => fail closed rather than overwrite blindly.
  if (Number.isNaN(expected) || Number.isNaN(current)) return "conflict";
  return expected === current ? "ok" : "conflict";
}
