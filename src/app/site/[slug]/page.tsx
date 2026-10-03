import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalSiteRenderer } from "@/components/site/personal-site-renderer";
import {
  getPublishedPersonalSiteBySlug,
  getPersonalSiteBySlugForPreview,
} from "@/lib/actions/personal-site";
import { createT, getCurrentLang } from "@/lib/i18n";
import { generatePersonalSiteMetadata } from "@/lib/personal-site/metadata";
import { db } from "@/db";
import { workspaces, availabilityRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAvailableSlots } from "@/lib/actions/appointments";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; date?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPersonalSiteBySlugForPreview(slug);
  if (!site) return { title: "Site not found" };
  return generatePersonalSiteMetadata(site);
}

export default async function PublicPersonalSitePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { preview, date } = await searchParams;
  const isPreview = preview === "1";

  const [site, lang] = await Promise.all([
    isPreview
      ? getPersonalSiteBySlugForPreview(slug)
      : getPublishedPersonalSiteBySlug(slug),
    getCurrentLang(),
  ]);
  if (!site) notFound();

  // Load workspace & booking context if booking section exists
  let bookingData = null;
  const hasBookingSection = site.sections.some((s) => s.type === "booking");
  const wsId = (site as any).workspaceId;
  if (hasBookingSection && wsId) {
    const [ws] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        bookingSlug: workspaces.bookingSlug,
        bookingMeetingPlatform: workspaces.bookingMeetingPlatform,
        bookingMeetingLink: workspaces.bookingMeetingLink,
        bookingAllowedPlatforms: workspaces.bookingAllowedPlatforms,
        logoUrl: workspaces.logoUrl,
      })
      .from(workspaces)
      .where(eq(workspaces.id, wsId))
      .limit(1);

    if (ws) {
      const [firstRule] = await db
        .select({ timezone: availabilityRules.timezone })
        .from(availabilityRules)
        .where(eq(availabilityRules.workspaceId, ws.id))
        .limit(1);
      const timezone = firstRule?.timezone || "Asia/Jakarta";
      const selectedDate = date || new Date().toISOString().split("T")[0];

      let initialSlots: { start: string; end: string }[] = [];
      let initialError = "";
      try {
        initialSlots = await getAvailableSlots(ws.id, selectedDate);
      } catch (err) {
        initialError = err instanceof Error ? err.message : "Failed to load slots";
      }

      bookingData = {
        workspace: ws,
        timezone,
        initialDate: selectedDate,
        initialSlots,
        initialError,
      };
    }
  }

  const t = createT(lang);
  return (
    <PersonalSiteRenderer
      site={site}
      bookingData={bookingData}
      lang={lang}
      labels={{
        about: t("Tentang", "About"),
        workWithMe: t("Mari bekerja sama", "Work with me"),
        contactHint: t(
          "Pilih cara menghubungi atau lihat portfolio di bawah.",
          "Choose a contact or portfolio link below.",
        ),
        contact: t("Hubungi Saya", "Contact me"),
        openProject: t("Buka project", "Open project"),
        pageNav: t("Halaman situs", "Site pages"),
      }}
    />
  );
}
