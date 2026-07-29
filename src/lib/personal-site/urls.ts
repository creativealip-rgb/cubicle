import { normalizePersonalSiteSlug } from "./model";

function configuredPublicOrigin() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appOrigin?.includes("dev.cubiqlo.com")) return appOrigin;
  if (appOrigin?.includes("localhost") || appOrigin?.includes("127.0.0.1")) return appOrigin;
  return "https://cubiqlo.com";
}

export function personalSitePublicBaseUrl() {
  return `${configuredPublicOrigin()}/site`;
}

export function personalSitePublicUrl(slug: string) {
  return `${personalSitePublicBaseUrl()}/${normalizePersonalSiteSlug(slug)}`;
}

export function personalSitePreviewUrl() {
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return `${appOrigin || configuredPublicOrigin()}/site/preview`;
}
