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
  it("hides onboarding after every step is complete", () => {
    expect(renderToStaticMarkup(<DashboardOnboarding lang="en" steps={steps} />)).toBe("");
  });

  it("keeps pending onboarding actions visible", () => {
    const html = renderToStaticMarkup(
      <DashboardOnboarding lang="en" steps={steps.map((step, index) => ({ ...step, done: index !== 0 }))} />,
    );
    expect(html).toContain("Start from Settings");
    expect(html).toContain("Complete workspace profile");
  });
});

// WorkspaceBrandingForm behavior needs DOM/testing-library, absent from project deps.
// Its mode partition and submit wiring remain covered by source tests.
