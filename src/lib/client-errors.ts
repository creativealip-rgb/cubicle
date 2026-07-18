/**
 * Detect Next.js stale Server Action errors after a deploy.
 * Browser still has old action IDs → "Failed to find Server Action".
 */
export function isStaleServerActionError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);

  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to find server action") ||
    (lower.includes("server action") && lower.includes("not found")) ||
    lower.includes("failed to find server action with id") ||
    // Next sometimes surfaces as generic fetch/digest after deploy
    (lower.includes("an unexpected response was received from the server") &&
      lower.includes("action"))
  );
}

/** User-facing copy when stale action detected. */
export function staleServerActionMessage(lang: "id" | "en" = "id"): string {
  return lang === "en"
    ? "App was just updated. Refreshing page…"
    : "App baru di-deploy. Refresh halaman…";
}
