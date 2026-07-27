import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("portal token persistence", () => {
  it("keeps editable slug controls and builds a password-authenticated vanity URL", () => {
    const form = read("src/components/forms/client-form.tsx");
    const section = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");
    const portalPage = read("src/app/client-portal/[token]/page.tsx");

    expect(form).toContain("Slug portal");
    expect(form).toContain("portalSlug: form.portalSlug");
    expect(section).toContain("/client-portal/${slug}");
    expect(section).not.toContain("?token=");
    expect(portalPage).toContain("eq(clients.portalSlug, slugOrToken)");
    expect(portalPage).toContain("verifyPortalSession(");
  });
  it("stores generated portal tokens encrypted and clears them on revoke", () => {
    const schema = read("src/db/schema.ts");
    const actions = read("src/lib/actions/clients.ts");

    expect(schema).toContain('portalTokenEnc: text("portal_token_enc")');
    expect(actions).toContain("portalTokenEnc: encryptSecret(rawToken)");
    expect(actions).toContain("portalTokenEnc: null");
  });

  it("renders a stable portal link after tab remount or client edit refresh", () => {
    const section = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");

    expect(section).toContain("existingPortalToken: string | null");
    expect(section).toContain("const slug=client.portalSlug || fallbackSlug");
    expect(section).toContain("const portalUrl=`${origin}/client-portal/${slug}`");
  });

  it("never renders a raw portal token", () => {
    const section = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");

    expect(section).toContain("Link portal");
    expect(section).not.toContain("portalToken}");
    expect(section).not.toContain("?token=");
  });
});
