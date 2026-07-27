import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("friendly slug authorization boundary", () => {
  it("resolves password portal slug only with HttpOnly session guard", () => {
    const portal = read("src/lib/actions/portal.ts");
    expect(portal).not.toContain("or(eq(clients.portalTokenHash");
    expect(portal).toContain("eq(clients.portalTokenHash, tokenHash)");
    expect(portal).toContain("eq(clients.portalSlug, value)");
    expect(portal).toContain("verifyPortalSession");
    expect(portal).toContain("client.portalPasswordHash");
  });

  it("disables portal slug authorization by default", () => {
    const schema = read("src/db/schema.ts");
    expect(schema).toContain('portalSlugEnabled: boolean("portal_slug_enabled").notNull().default(false)');
  });

  it("does not present a slug-only portal link in client UI", () => {
    const form = read("src/components/forms/client-form.tsx");
    const section = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");
    expect(form).not.toContain("Short link: /client-portal/");
    expect(form).not.toContain("Slug aktif");
    expect(section).toContain("const slug=client.portalSlug || fallbackSlug");
    expect(section).toContain("/client-portal/${slug}");
    expect(section).not.toContain("?token=");
  });

  it("keeps public document credentials high entropy, hashed, expiring, and revocable", () => {
    const schema = read("src/db/schema.ts");
    for (const field of ["sharedTokenHash", "sharedTokenExpiresAt", "sharedTokenRevokedAt"]) {
      expect(schema).toContain(field);
    }
    for (const path of [
      "src/lib/actions/proposals.ts",
      "src/lib/actions/questionnaires.ts",
      "src/lib/actions/contracts.ts",
    ]) {
      const body = read(path);
      expect(body).toContain('randomBytes(32).toString("base64url")');
      expect(body).toContain('createHash("sha256")');
    }
  });

  it("uses short-lived R2 download URLs after authorization", () => {
    const route = read("src/app/api/files/[fileId]/download/route.ts");
    const r2 = read("src/lib/r2.ts");
    expect(route.lastIndexOf("getSignedDownloadUrl")).toBeGreaterThan(route.indexOf("Forbidden"));
    expect(r2).toContain("expiresIn = 300");
  });
});
