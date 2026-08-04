"use server";

import { and, eq, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { personalSites, workspaces } from "@/db/schema";
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

export type PersonalSiteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  slug?: string;
  published?: boolean;
};

async function ownerContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceOwner(db, user.id, workspaceId);
  return { userId: user.id, workspaceId };
}

export async function getPersonalSiteForCurrentOwner(): Promise<PersonalSiteInput | null> {
  const { userId, workspaceId } = await ownerContext();
  const [site] = await db
    .select()
    .from(personalSites)
    .where(and(eq(personalSites.workspaceId, workspaceId), eq(personalSites.userId, userId)))
    .limit(1);
  if (!site) return null;
  return normalizeStoredPersonalSite({
    ...site,
    subtitle: site.subtitle ?? "",
    about: site.about ?? "",
    ctaLabel: site.ctaLabel ?? "",
    ctaUrl: site.ctaUrl ?? "",
  });
}

export async function getSuggestedPersonalSiteDefaults(): Promise<PersonalSiteInput> {
  const { userId, workspaceId } = await ownerContext();
  const [workspace] = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const base = normalizePersonalSiteSlug(workspace?.slug || "my-studio");
  const candidates = [base, `${base}-${userId.slice(0, 6).toLowerCase()}`];
  for (const slug of candidates) {
    if (slug.length < 2) continue;
    const [taken] = await db.select({ id: personalSites.id }).from(personalSites).where(eq(personalSites.slug, slug)).limit(1);
    if (!taken) return { ...DEFAULT_PERSONAL_SITE, slug };
  }
  return { ...DEFAULT_PERSONAL_SITE, slug: `site-${userId.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase()}` };
}

export async function checkSlugUnique(slug: string): Promise<boolean> {
  const { userId, workspaceId } = await ownerContext();
  const clean = normalizePersonalSiteSlug(slug);
  const parsed = personalSiteInputSchema.shape.slug.safeParse(clean);
  if (!parsed.success) return false;

  const [taken] = await db
    .select({ id: personalSites.id })
    .from(personalSites)
    .where(
      and(
        eq(personalSites.slug, clean),
        or(
          ne(personalSites.workspaceId, workspaceId),
          ne(personalSites.userId, userId),
        ),
      ),
    )
    .limit(1);
  return !taken;
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
  const intent = String(formData.get("intent") || "draft");
  let decoded: unknown;
  try {
    decoded = JSON.parse(String(rawPayload || "{}"));
  } catch {
    return { status: "error", message: "Data landing page tidak valid. Muat ulang lalu coba lagi." };
  }

  const payload = personalSiteInputSchema.safeParse({
    ...(decoded as Record<string, unknown>),
    slug: normalizePersonalSiteSlug(String((decoded as Record<string, unknown>)?.slug || "")),
    published: intent === "publish" ? true : intent === "unpublish" || intent === "draft" ? false : false,
  });
  if (!payload.success) {
    return {
      status: "error",
      message: "Periksa kembali field yang ditandai.",
      fieldErrors: payload.error.flatten().fieldErrors,
    };
  }
  const data = payload.data;

  if (data.published && data.ctaLabel && !data.ctaUrl) {
    return {
      status: "error",
      message: "CTA publik membutuhkan tujuan yang aman.",
      fieldErrors: { ctaUrl: ["Isi URL booking, email, telepon, atau website publik."] },
    };
  }

  const { userId, workspaceId } = await ownerContext();
  let previousSlug: string | null = null;

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
        updatedAt: new Date(),
      };

      if (current) {
        await tx.update(personalSites).set(values).where(eq(personalSites.id, current.id));
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

  revalidatePath("/app/personal-site");
  revalidatePath("/site/preview");
  if (previousSlug && previousSlug !== data.slug) revalidatePath(`/site/${previousSlug}`);
  revalidatePath(`/site/${data.slug}`);

  return {
    status: "success",
    message: data.published ? "Landing page berhasil dipublikasikan." : "Draft landing page berhasil disimpan.",
    slug: data.slug,
    published: data.published,
  };
}

export async function getPublishedPersonalSiteBySlug(slug: string): Promise<PersonalSiteInput | null> {
  const clean = normalizePersonalSiteSlug(slug);
  if (clean !== slug) return null;
  const [site] = await db
    .select()
    .from(personalSites)
    .where(and(eq(personalSites.slug, clean), eq(personalSites.published, true)))
    .limit(1);
  if (!site) return null;
  return normalizeStoredPersonalSite({
    ...site,
    subtitle: site.subtitle ?? "",
    about: site.about ?? "",
    ctaLabel: site.ctaLabel ?? "",
    ctaUrl: site.ctaUrl ?? "",
  });
}

export async function getPersonalSiteBySlugForPreview(slug: string): Promise<PersonalSiteInput | null> {
  const clean = normalizePersonalSiteSlug(slug);
  if (clean !== slug) return null;
  const [site] = await db
    .select()
    .from(personalSites)
    .where(eq(personalSites.slug, clean))
    .limit(1);
  if (!site) return null;
  if (site.published) {
    return normalizeStoredPersonalSite({
      ...site,
      subtitle: site.subtitle ?? "",
      about: site.about ?? "",
      ctaLabel: site.ctaLabel ?? "",
      ctaUrl: site.ctaUrl ?? "",
    });
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

  return normalizeStoredPersonalSite({
    ...site,
    subtitle: site.subtitle ?? "",
    about: site.about ?? "",
    ctaLabel: site.ctaLabel ?? "",
    ctaUrl: site.ctaUrl ?? "",
  });
}
