import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const clientDetail = readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx", "utf8");

describe("client detail portal request card removal", () => {
  it("does not render the admin portal request form on the client detail portal tab", () => {
    expect(clientDetail).not.toContain("PortalRequestAdmin");
    expect(clientDetail).not.toContain("clientPortalRequests");
    expect(clientDetail).not.toContain("portalRequests");
  });

  it("keeps portal password ownership in the edit client form", () => {
    const form = readFileSync("src/components/forms/client-form.tsx", "utf8");
    expect(clientDetail).not.toContain("PortalTokenSection");
    expect(form).toContain("setClientPortalPassword");
    expect(form).toContain("portalPassword");
  });
});
