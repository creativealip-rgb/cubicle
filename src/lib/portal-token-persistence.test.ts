import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("portal token persistence", () => {
  it("keeps editable slug controls and builds a token-authenticated vanity URL", () => {
    const form = read("src/components/forms/client-form.tsx");
    const section = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");
    const vanityRoute = read("src/app/client-portal/s/[slug]/page.tsx");

    expect(form).toContain("Slug portal");
    expect(form).toContain("portalSlug: form.portalSlug");
    expect(section).toContain("/client-portal/s/${client.portalSlug}?token=${portalToken}");
    expect(vanityRoute).toContain("getClientPortalAccess(rawToken)");
    expect(vanityRoute).toContain("client.portalSlug !== slug");
  });
  it("stores generated portal tokens encrypted and clears them on revoke", () => {
    const schema = read("src/db/schema.ts");
    const actions = read("src/lib/actions/clients.ts");

    expect(schema).toContain('portalTokenEnc: text("portal_token_enc")');
    expect(actions).toContain("portalTokenEnc: encryptSecret(rawToken)");
    expect(actions).toContain("portalTokenEnc: null");
  });

  it("hydrates the existing portal link after tab remount or client edit refresh", () => {
    const page = read("src/app/(app)/app/clients/[clientId]/page.tsx");
    const section = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");

    expect(page).toContain("existingPortalToken={existingPortalToken}");
    expect(section).toContain("existingPortalToken: string | null");
    expect(section).toContain("useState<string | null>(existingPortalToken)");
  });

  it("never renders the persisted raw token after its one-time generation view", () => {
    const section = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");

    expect(section).toContain("Link portal (siap bagikan)");
    expect(section).toContain("{showToken && (");
    expect(section).not.toContain("portalUrl && showToken &&");
  });
});
