/**
 * Stable error code for quota-blocked uploads. Lives in this pure module (no
 * server imports) so both the API layer and client components can share it
 * without pulling server-only code into the client bundle.
 */
export const QUOTA_BLOCK_CODE = "QUOTA_BLOCKED";

export function isQuotaBlockCode(code: string | null | undefined): boolean {
  return code === QUOTA_BLOCK_CODE;
}

export const QUOTA_BLOCK_MESSAGE_ID = "Kuota penyimpanan workspace sudah penuh. Hapus beberapa file atau tingkatkan paket Anda untuk melanjutkan.";
export const QUOTA_BLOCK_MESSAGE_EN = "Workspace storage quota is full. Delete some files or upgrade your plan to continue.";

/**
 * Map a quota-block error code from an upload API response to a bilingual
 * (ID/EN) message. Returns null when `code` is not a quota-block, so callers
 * fall back to the raw error for all other failures.
 */
export function quotaBlockMessage(
  code: string | null | undefined,
  lang: "id" | "en",
): string | null {
  if (code !== QUOTA_BLOCK_CODE) return null;
  return lang === "en" ? QUOTA_BLOCK_MESSAGE_EN : QUOTA_BLOCK_MESSAGE_ID;
}
