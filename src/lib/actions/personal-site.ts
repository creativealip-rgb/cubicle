"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { personalSites } from "@/db/schema";
import { assertWorkspaceOwner, requireUser } from "@/lib/access";
import { auth } from "@/lib/auth";
import {
  DEFAULT_PERSONAL_SITE,
  normalizePersonalSiteSlug,
  normalizeStoredPersonalSite,
  personalSiteInputSchema,
  type PersonalSiteInput,
} from "@/lib/personal-site/model";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { getEffectivePlan } from "@/lib/plan";
import { getPersonalSiteOwnerPlanContext, listPersonalSiteRows } from "@/lib/personal-site/plan-context";
import { canEditPersonalSiteSlug, getEffectivePersonalSiteSlug } from "@/lib/personal-site/slug-policy";
import { findPersonalSiteByEffectiveSlug, hasEffectiveSlugCollision } from "@/lib/personal-site/slug-records";
import { resolvePublicationState } from "@/lib/personal-site/publication-intent";
import { resolveSaveConflict, STALE_REVISION_MESSAGE } from "@/lib/personal-site/save-revision";
export type PersonalSiteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Structured Zod issue paths (e.g. ["pages", 0, "sections", 3, "alt"]). */
  issuePaths?: (string | number)[][];
  slug?: string;
  published?: boolean;
  /** Set when the row moved on since this editor loaded it. Never auto-merged. */
  conflict?: boolean;
  /** The revision written by a successful save, or the current stored revision
   *  on a conflict, so the editor can refresh its stale token. */
  revision?: string;
};

async function ownerContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceOwner(db, user.id, workspaceId);
  const planContext = await getPersonalSiteOwnerPlanContext(workspaceId);
  if (!planContext) throw new Error("Personal site owner workspace not found");
  return { userId: user.id, workspaceId, planContext };
}

export async function getPersonalSiteSlugEntitlement(): Promise<boolean> {
  const { planContext } = await ownerContext();
  return canEditPersonalSiteSlug(getEffectivePlan(planContext.plan, planContext.planExpiresAt));
}

export async function getPersonalSiteForCurrentOwner(): Promise<PersonalSiteInput | null> {
  const { userId, workspaceId, planContext } = await ownerContext();
  const [site] = await db
    .select()
    .from(personalSites)
    .where(and(eq(personalSites.workspaceId, workspaceId), eq(personalSites.userId, userId)))
    .limit(1);
  if (!site) return null;
  return normalizeStoredPersonalSite({
    ...site,
    slug: getEffectivePersonalSiteSlug(
      getEffectivePlan(planContext.plan, planContext.planExpiresAt),
      planContext.workspaceSlug,
      site.slug,
    ),
    subtitle: site.subtitle ?? "",
    about: site.about ?? "",
    ctaLabel: site.ctaLabel ?? "",
    ctaUrl: site.ctaUrl ?? "",
  });
}

/**
 * Revision token of the current owner's stored row, threaded to the editor as a
 * separate prop (the `PersonalSiteInput` storage contract stays unchanged).
 * `null` means no row yet, so the first save has nothing to conflict with.
 */
export async function getPersonalSiteRevisionForCurrentOwner(): Promise<string | null> {
  const { userId, workspaceId } = await ownerContext();
  const rows = await listPersonalSiteRows();
  const current = rows.find((row) => row.workspaceId === workspaceId && row.userId === userId);
  return current?.updatedAt ? new Date(current.updatedAt).toISOString() : null;
}

export async function getSuggestedPersonalSiteDefaults(): Promise<PersonalSiteInput> {
  const { planContext } = await ownerContext();
  const slug = getEffectivePersonalSiteSlug(
    getEffectivePlan(planContext.plan, planContext.planExpiresAt),
    planContext.workspaceSlug,
    null,
  );
  return { ...DEFAULT_PERSONAL_SITE, slug };
}

export async function checkSlugUnique(slug: string): Promise<boolean> {
  const { userId, workspaceId, planContext } = await ownerContext();
  const candidate = getEffectivePersonalSiteSlug(
    getEffectivePlan(planContext.plan, planContext.planExpiresAt),
    planContext.workspaceSlug,
    slug,
  );
  if (!personalSiteInputSchema.shape.slug.safeParse(candidate).success) return false;
  const rows = await listPersonalSiteRows();
  const current = rows.find((row) => row.workspaceId === workspaceId && row.userId === userId);
  return !hasEffectiveSlugCollision(rows, candidate, current?.id);
}

function postgresDetails(error: unknown) {
  const outer = error as { code?: string; constraint?: string; cause?: unknown };
  const cause = outer?.cause as { code?: string; constraint?: string } | undefined;
  return {
    code: outer?.code ?? cause?.code,
    constraint: outer?.constraint ?? cause?.constraint,
  };
}

export async function savePersonalSite(
  _previousState: PersonalSiteActionState,
  formData: FormData,
): Promise<PersonalSiteActionState> {
  const rawPayload = formData.get("site");
  // Omitted intent === plain autosave === preserve (see resolvePublicationState).
  const intent = String(formData.get("intent") || "save");
  // Optimistic-concurrency revision the editor loaded (updated_at ISO string).
  const revisionRaw = String(formData.get("revision") || "") || null;
  // Explicit Keep-local override. Never implied, never an auto-merge.
  const force = formData.get("force") === "1";
  const expectedRevision = revisionRaw ? new Date(revisionRaw) : null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(String(rawPayload || "{}"));
  } catch {
    return { status: "error", message: "Data landing page tidak valid. Muat ulang lalu coba lagi." };
  }

  const { userId, workspaceId, planContext } = await ownerContext();
  // Fetch the stored row BEFORE deciding `published`: autosave must preserve
  // whatever is already stored, so the current value is an input to the decision.
  const rows = await listPersonalSiteRows();
  const currentRow = rows.find((row) => row.workspaceId === workspaceId && row.userId === userId);
  const effectiveSlug = getEffectivePersonalSiteSlug(
    getEffectivePlan(planContext.plan, planContext.planExpiresAt),
    planContext.workspaceSlug,
    String((decoded as Record<string, unknown>)?.slug || ""),
  );
  const payload = personalSiteInputSchema.safeParse({
    ...(decoded as Record<string, unknown>),
    slug: effectiveSlug,
    published: resolvePublicationState(intent, currentRow?.published ?? false),
  });
  if (!payload.success) {
    return {
      status: "error",
      message: "Periksa kembali field yang ditandai.",
      fieldErrors: payload.error.flatten().fieldErrors,
      // flatten() collapses nested issues under their top-level key; keep the
      // full paths so the client can jump to the offending section/property.
      // Zod v4 types a path segment as PropertyKey; only strings and numbers can
      // occur in this schema, so narrow rather than widen the public type.
      issuePaths: payload.error.issues.map((issue) =>
        issue.path.filter(
          (segment): segment is string | number => typeof segment === "string" || typeof segment === "number",
        ),
      ),
    };
  }
  const data = payload.data;

  // Stale-tab guard: refuse to write unless the row is still at the revision
  // this editor loaded. Explicit Keep-local (`force`) is the only bypass, and
  // the two JSON documents are never merged.
  const staleRevisionState = (): PersonalSiteActionState => ({
    status: "error",
    conflict: true,
    message: STALE_REVISION_MESSAGE,
    revision: currentRow?.updatedAt ? new Date(currentRow.updatedAt).toISOString() : undefined,
  });
  if (!force && resolveSaveConflict(revisionRaw, currentRow?.updatedAt ?? null) === "conflict") {
    return staleRevisionState();
  }

  if (hasEffectiveSlugCollision(rows, data.slug, currentRow?.id)) {
    return {
      status: "error",
      message: "Slug sudah dipakai. Pilih alamat publik lain.",
      fieldErrors: { slug: ["Slug sudah dipakai."] },
    };
  }
  let previousSlug: string | null = null;
  let conflictDetected = false;
  const nextRevision = new Date();

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ id: personalSites.id, slug: personalSites.slug })
        .from(personalSites)
        .where(and(eq(personalSites.workspaceId, workspaceId), eq(personalSites.userId, userId)))
        .limit(1);
      previousSlug = current?.slug ?? null;

      const values = {
        ...data,
        workspaceId,
        userId,
        subtitle: data.subtitle || null,
        about: data.about || null,
        ctaLabel: data.ctaLabel || null,
        ctaUrl: data.ctaUrl || null,
        updatedAt: nextRevision,
      };

      if (current) {
        // Optimistic concurrency: only write while the row still carries the
        // revision this editor loaded. Rows-affected is the authority, so a
        // concurrent write between the read above and this UPDATE is caught
        // too. `force` is the explicit Keep-local override; no merge ever.
        const revisionGuard =
          force || expectedRevision === null
            ? eq(personalSites.id, current.id)
            : and(eq(personalSites.id, current.id), eq(personalSites.updatedAt, expectedRevision));
        const applied = await tx
          .update(personalSites)
          .set(values)
          .where(revisionGuard)
          .returning({ id: personalSites.id });
        if (applied.length === 0) conflictDetected = true;
      } else {
        await tx.insert(personalSites).values(values);
      }
    });
  } catch (error) {
    const details = postgresDetails(error);
    if (details.code === "23505" && details.constraint === "personal_sites_slug_uidx") {
      return {
        status: "error",
        message: "Slug sudah dipakai. Pilih alamat publik lain.",
        fieldErrors: { slug: ["Slug sudah dipakai."] },
      };
    }
    if (details.code === "23505" && details.constraint === "personal_sites_owner_workspace_uidx") {
      return { status: "error", message: "Landing page berubah dari sesi lain. Muat ulang lalu coba lagi." };
    }
    console.error("personal-site save failed", {
      code: details.code,
      constraint: details.constraint,
      workspaceId,
      userId,
    });
    return { status: "error", message: "Landing page gagal disimpan. Coba lagi." };
  }

  // Lost the race inside the transaction (the row moved on after the pre-check).
  if (conflictDetected) return staleRevisionState();

  revalidatePath("/app/personal-site");
  revalidatePath("/site/preview");
  if (previousSlug && previousSlug !== data.slug) revalidatePath(`/site/${previousSlug}`);
  revalidatePath(`/site/${data.slug}`);

  return {
    status: "success",
    message: data.published ? "Landing page berhasil dipublikasikan." : "Draft landing page berhasil disimpan.",
    slug: data.slug,
    published: data.published,
    // New revision token, so the editor's next save is not stale.
    revision: nextRevision.toISOString(),
  };
}

export async function getPublishedPersonalSiteBySlug(
  slug: string,
): Promise<(PersonalSiteInput & { userId: string; workspaceId: string }) | null> {
  const clean = normalizePersonalSiteSlug(slug);
  const match = findPersonalSiteByEffectiveSlug(await listPersonalSiteRows(), clean, { publishedOnly: true });
  if (!match) return null;
  const [site] = await db
    .select()
    .from(personalSites)
    .where(eq(personalSites.id, match.id))
    .limit(1);
  if (!site) return null;
  return {
    ...normalizeStoredPersonalSite({
      ...site,
      subtitle: site.subtitle ?? "",
      about: site.about ?? "",
      ctaLabel: site.ctaLabel ?? "",
      ctaUrl: site.ctaUrl ?? "",
    }),
    userId: site.userId,
    workspaceId: site.workspaceId,
  };
}

export async function getPersonalSiteBySlugForPreview(slug: string): Promise<(PersonalSiteInput & { workspaceId?: string }) | null> {
  const clean = normalizePersonalSiteSlug(slug);
  const match = findPersonalSiteByEffectiveSlug(await listPersonalSiteRows(), clean);
  if (!match) return null;
  const [site] = await db
    .select()
    .from(personalSites)
    .where(eq(personalSites.id, match.id))
    .limit(1);
  if (!site) return null;
  if (site.published) {
    return {
      ...normalizeStoredPersonalSite({
        ...site,
        subtitle: site.subtitle ?? "",
        about: site.about ?? "",
        ctaLabel: site.ctaLabel ?? "",
        ctaUrl: site.ctaUrl ?? "",
      }),
      workspaceId: site.workspaceId,
    };
  }

  // If draft, verify user owns/belongs to the workspace
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return null;
    const workspaceId = await getWorkspaceForCurrentUser();
    if (site.workspaceId !== workspaceId) return null;
  } catch {
    return null;
  }

  return {
    ...normalizeStoredPersonalSite({
      ...site,
      subtitle: site.subtitle ?? "",
      about: site.about ?? "",
      ctaLabel: site.ctaLabel ?? "",
      ctaUrl: site.ctaUrl ?? "",
    }),
    workspaceId: site.workspaceId,
  };
}
