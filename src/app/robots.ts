import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.CUBIQLO_ENV === "development") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://cubiqlo.com/sitemap.xml",
  };
}
