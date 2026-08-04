import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonalSiteRenderer } from "@/components/site/personal-site-renderer";
import {
  getPublishedPersonalSiteBySlug,
  getPersonalSiteBySlugForPreview,
} from "@/lib/actions/personal-site";
import { createT, getCurrentLang } from "@/lib/i18n";
import { generatePersonalSiteMetadata } from "@/lib/personal-site/metadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
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
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const [site, lang] = await Promise.all([
    isPreview
      ? getPersonalSiteBySlugForPreview(slug)
      : getPublishedPersonalSiteBySlug(slug),
    getCurrentLang(),
  ]);
  if (!site) notFound();
  const t = createT(lang);
  return (
    <PersonalSiteRenderer
      site={site}
      labels={{
        about: t("Tentang", "About"),
        workWithMe: t("Mari bekerja sama", "Work with me"),
        contactHint: t(
          "Pilih cara menghubungi atau lihat portfolio di bawah.",
          "Choose a contact or portfolio link below.",
        ),
      }}
    />
  );
}
