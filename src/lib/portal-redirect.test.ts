import { describe, expect, it } from "vitest";
import { portalPublicUrl } from "./portal-redirect";

describe("portal public redirect URL", () => {
  it("uses trusted forwarded HTTPS origin behind reverse proxy", () => {
    const request = new Request("http://0.0.0.0:3100/client-portal/acme/unlock", {
      headers: { "x-forwarded-host": "dev.cubiqlo.com", "x-forwarded-proto": "https" },
    });
    expect(portalPublicUrl(request, "/client-portal/acme?error=invalid").toString()).toBe(
      "https://dev.cubiqlo.com/client-portal/acme?error=invalid",
    );
  });

  it("falls back to request origin without proxy headers", () => {
    const request = new Request("http://localhost:3100/client-portal/acme/unlock");
    expect(portalPublicUrl(request, "/client-portal/acme").toString()).toBe(
      "http://localhost:3100/client-portal/acme",
    );
  });
});
