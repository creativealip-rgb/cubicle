import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardOnboarding } from "./dashboard-onboarding";

const steps = [
  ["workspace", "/app/settings?tab=workspace"],
  ["invoiceSettings", "/app/settings?tab=invoice"],
  ["client", "/app/clients/new"],
  ["project", "/app/projects/new"],
  ["time", "/app/time"],
  ["invoice", "/app/invoices/new"],
  ["portal", "/app/settings?tab=workspace"],
].map(([key, href]) => ({ key, href, done: true }));

describe("DashboardOnboarding completed state", () => {
  it("renders all seven completed steps with exact copy and links", () => {
    const html = renderToStaticMarkup(<DashboardOnboarding lang="en" steps={steps} />);

    expect(html).toContain("Start from Settings");
    expect(html).toContain("Set up your workspace and invoice defaults before creating your first project.");
    expect((html.match(/href=/g) ?? []).length).toBe(7);
    expect((html.match(/✓/g) ?? []).length).toBe(7);
    expect(html).toContain('href="/app/settings?tab=workspace"');
    expect(html).toContain('href="/app/settings?tab=invoice"');
    expect(html).toContain("Complete workspace profile");
    expect(html).toContain("Set invoice &amp; payment defaults");
  });
});

// WorkspaceBrandingForm behavior needs DOM/testing-library, absent from project deps.
// Its mode partition and submit wiring remain covered by source tests.
