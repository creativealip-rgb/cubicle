"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import {
  cancelStorageAddon,
  getActiveStorageAddonBytes,
  listActiveStorageAddons,
} from "@/lib/storage-addons";
import {
  cancelExtraWorkspaceEntitlement,
  getActiveExtraWorkspaceSlots,
} from "@/lib/extra-workspace";
import { getUserPlan } from "@/lib/plan";
import { getUploadQuotaLimits } from "@/lib/upload-safety";
import { revalidatePath } from "next/cache";

/**
 * Billing add-on server actions (P0/P1 lifecycle endpoints).
 *
 * Add-ons are purchased per USER (not per workspace), so the workspace
 * membership checks used by entity-scoped actions do not apply here: the
 * owner of an add-on is the session user themselves. Both helpers already
 * scope their queries by `userId`, so cross-user access is impossible.
 */

/** Active storage add-ons (bytes still counting, incl. cancel_scheduled). */
export async function listActiveAddOns(): Promise<{
  ok: boolean;
  error?: string;
  storageBytes: number;
  storageAddons: Awaited<ReturnType<typeof listActiveStorageAddons>>;
  extraWorkspaceSlots: number;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);

  const [storageAddons, storageBytes, extraWorkspaceSlots] = await Promise.all([
    listActiveStorageAddons(user.id),
    getActiveStorageAddonBytes(user.id),
    getActiveExtraWorkspaceSlots(user.id),
  ]);

  return { ok: true, storageBytes, storageAddons, extraWorkspaceSlots };
}

/** Storage add-on usage context (bytes + limits) for quota UI. */
export async function getStorageAddOnUsage(): Promise<{
  ok: boolean;
  error?: string;
  addonBytes: number;
  baseBytes: number;
  maxBytes: number;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);

  const [plan, addonBytes] = await Promise.all([
    getUserPlan(user.id),
    getActiveStorageAddonBytes(user.id),
  ]);
  const baseBytes = getUploadQuotaLimits(plan).maxWorkspaceBytes ?? 0;

  return { ok: true, addonBytes, baseBytes, maxBytes: baseBytes + addonBytes };
}

/**
 * Cancel a storage add-on at period end (stays active until ends_at, then the
 * expiry sweep flips it to cancelled). Idempotent.
 */
export async function cancelStorageAddOn(addonId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);

  const result = await cancelStorageAddon(addonId, user.id);
  if (!result.ok) return result;

  revalidatePath("/app/billing");
  return { ok: true };
}

/**
 * Cancel an extra-workspace entitlement at period end (slots stay active
 * until ends_at, then the sweep flips it to cancelled). Idempotent.
 */
export async function cancelExtraWorkspaceAddOn(
  entitlementId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);

  const result = await cancelExtraWorkspaceEntitlement(entitlementId, user.id);
  if (!result.ok) return result;

  revalidatePath("/app/billing");
  return { ok: true };
}
