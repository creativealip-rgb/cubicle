import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { personalSites } from "@/db/schema";
import { normalizePersonalSiteSlug, normalizeStoredPersonalSite } from "@/lib/personal-site/model";

// Dynamic OG image for public personal site share cards (Phase 7).
// Used as a fallback when the site owner has not uploaded a custom OG image.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getSiteForOg(slug: string) {
  const clean = normalizePersonalSiteSlug(slug);
  if (clean !== slug) return null;
  const [site] = await db
    .select()
    .from(personalSites)
    .where(eq(personalSites.slug, clean))
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

export async function GET(request: Request, { params }: Props) {
  const { slug } = await params;
  const site = await getSiteForOg(slug);

  if (!site) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#111827",
            color: "#e5e7eb",
            fontSize: 32,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          Site not found
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // Accept-Language is forwarded by Next on the request object; fall back to id.
  const acceptLanguage = request.headers.get("Accept-Language") ?? "id";

  const title = site.seo?.title?.trim() || site.title;
  const subtitle = site.subtitle?.trim() || site.hero.slice(0, 120);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://cubiqlo.com";
  let domain = baseUrl;
  try {
    domain = new URL(baseUrl).hostname;
  } catch {
    // keep raw string if origin is malformed
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: site.themeConfig?.backgroundColor ?? "#ffffff",
          padding: "80px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "80px",
            fontSize: 24,
            fontWeight: 600,
            color: site.themeConfig?.textColor ?? "#111827",
            opacity: 0.7,
            display: "flex",
          }}
        >
          {domain}
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: "1000px",
            color: site.themeConfig?.textColor ?? "#111827",
            display: "flex",
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: "24px",
              fontSize: 30,
              lineHeight: 1.4,
              maxWidth: "1000px",
              color: site.themeConfig?.textColor ?? "#111827",
              opacity: 0.75,
              display: "flex",
            }}
          >
            {subtitle}
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "80px",
            right: "80px",
            height: "6px",
            backgroundColor: site.themeConfig?.primaryColor ?? site.accent,
            display: "flex",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
