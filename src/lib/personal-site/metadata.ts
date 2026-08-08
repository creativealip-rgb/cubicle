import type { Metadata } from "next";
import { personalSitePublicUrl } from "./urls";
import type { PersonalSiteInput } from "./model";

/**
 * Build Open Graph image URL for a personal site.
 * Falls back to dynamic OG route when no custom OG image is set.
 */
export function buildOpenGraphImageUrl(site: PersonalSiteInput): string | undefined {
  if (site.seo?.ogImage) {
    return site.seo.ogImage;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                  process.env.NEXT_PUBLIC_APP_URL ||
                  "https://cubiqlo.com";
  return `${baseUrl}/api/og/personal-site/${encodeURIComponent(site.slug)}`;
}

/**
 * Generate SEO metadata for a published personal site page.
 * Respects user-defined SEO title/description and generates OpenGraph tags.
 */
export function generatePersonalSiteMetadata(
  site: PersonalSiteInput,
  extraParams?: Record<string, unknown>,
): Metadata {
  const baseUrl = personalSitePublicUrl(site.slug);
  
  const effectiveTitle = site.seo?.title?.trim() || site.title;
  const effectiveDescription = site.seo?.description?.trim() || site.hero;
  
  const ogImage = buildOpenGraphImageUrl(site);
  
  return {
    title: effectiveTitle,
    description: effectiveDescription,
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: baseUrl,
      siteName: site.title,
      title: effectiveTitle,
      description: effectiveDescription,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: effectiveTitle,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      site: site.title,
      title: effectiveTitle,
      description: effectiveDescription,
      images: ogImage ? [ogImage] : [],
    },
    ...extraParams,
  };
}

/**
 * Generate SEO metadata for a sub-page of a personal site.
 * Appends page title to site title, respects SEO overrides only on home page.
 */
export function generatePersonalSiteSubPageMetadata(
  site: PersonalSiteInput,
  pageSlug: string,
): Metadata {
  const page = site.pages?.find((p) => p.slug === pageSlug);
  if (!page) {
    return { title: "Page not found" };
  }
  
  const baseUrl = `${personalSitePublicUrl(site.slug)}/${pageSlug}`;
  
  // Sub-pages don't get individual SEO overrides yet; they inherit site SEO
  // but with a different title that includes the page name
  const effectiveTitle = page.title;
  const effectiveDescription = site.seo?.description?.trim() || site.hero;
  
  const ogImage = buildOpenGraphImageUrl(site);
  
  return {
    title: `${effectiveTitle} | ${site.title}`,
    description: effectiveDescription,
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: baseUrl,
      siteName: site.title,
      title: effectiveTitle,
      description: effectiveDescription,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: effectiveTitle,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      site: site.title,
      title: effectiveTitle,
      description: effectiveDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}
