/**
 * Shared deterministic portal-slug helpers used by both the client form
 * ("Generate" button) and the server action (uniqueness preflight).
 *
 * The DB constraint `clients_portal_slug_unique` is a GLOBAL partial unique
 * index on `clients.portal_slug` (see drizzle/0012_phase1_portal_slug_requests.sql),
 * so candidates must be unique across ALL workspaces, not just the current one.
 *
 * This module must stay free of server-only imports so it can be bundled into
 * client components.
 */

export const PORTAL_SLUG_MAX_LENGTH = 60;
export const PORTAL_SLUG_MIN_LENGTH = 3;
export const PORTAL_SLUG_FALLBACK_BASE = "client-portal";

/** Lowercase alphanumeric + hyphens, no leading/trailing hyphens, capped at 60 chars. */
export function slugifyPortalSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PORTAL_SLUG_MAX_LENGTH);
}

/** Slug base for candidate generation; falls back to "client-portal" when too short/empty. */
export function portalSlugBase(value: string): string {
  const slug = slugifyPortalSlug(value);
  return slug.length >= PORTAL_SLUG_MIN_LENGTH ? slug : PORTAL_SLUG_FALLBACK_BASE;
}

/**
 * Deterministic suffix candidates for a base slug: [base, base-2, base-3, ...].
 * Each suffixed candidate stays within PORTAL_SLUG_MAX_LENGTH by truncating the
 * head before appending "-N". `count` = number of suffixed candidates beyond the
 * bare base (default 20 → up to base-21).
 */
export function buildPortalSlugCandidates(base: string, count = 20): string[] {
  const normalized = portalSlugBase(base);
  const candidates: string[] = [normalized];
  for (let i = 2; i <= count + 1; i++) {
    const suffix = `-${i}`;
    const head = normalized.slice(0, PORTAL_SLUG_MAX_LENGTH - suffix.length);
    candidates.push(`${head}${suffix}`);
  }
  return candidates;
}
