import { afterEach, describe, expect, it } from "vitest";
import { personalSitePreviewUrl, personalSitePublicBaseUrl, personalSitePublicUrl } from "./urls";

const original = {
  site: process.env.NEXT_PUBLIC_SITE_URL,
  app: process.env.NEXT_PUBLIC_APP_URL,
};

afterEach(() => {
  if (original.site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = original.site;
  if (original.app === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = original.app;
});

describe("personal site URLs", () => {
  it("uses canonical public host when app host is production", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.cubiqlo.com";
    expect(personalSitePublicBaseUrl()).toBe("https://cubiqlo.com/site");
    expect(personalSitePublicUrl("Alip Studio")).toBe("https://cubiqlo.com/site/alip-studio");
    expect(personalSitePreviewUrl()).toBe("https://app.cubiqlo.com/site/preview");
  });

  it("keeps dev and local origins isolated", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3205/";
    expect(personalSitePublicUrl("qa-page")).toBe("http://127.0.0.1:3205/site/qa-page");
    expect(personalSitePreviewUrl()).toBe("http://127.0.0.1:3205/site/preview");
  });

  it("honors an explicit public-site origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://pages.example.com/";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(personalSitePublicUrl("northstar")).toBe("https://pages.example.com/site/northstar");
  });
});
