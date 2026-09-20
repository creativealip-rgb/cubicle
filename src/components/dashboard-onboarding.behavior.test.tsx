import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardOnboarding } from "./dashboard-onboarding";

const steps = [
  ["client", "/app/clients"],
  ["landingpage", "/app/personal-site"],
  ["personal", "/app/personal"],
  ["docs", "/app/docs"],
].map(([key, href]) => ({ key, href, done: true }));

describe("DashboardOnboarding completed state", () => {
  it("hides onboarding after every step is complete", () => {
    expect(renderToStaticMarkup(<DashboardOnboarding lang="en" steps={steps} />)).toBe("");
  });

  it("keeps pending onboarding actions visible with updated 4 steps", () => {
    const html = renderToStaticMarkup(
      <DashboardOnboarding lang="en" steps={steps.map((step, index) => ({ ...step, done: index !== 0 }))} />,
    );
    expect(html).toContain("Getting Started Checklist");
    expect(html).toContain("Add first client");
    expect(html).toContain("Create landingpage");
    expect(html).toContain("Setup your personal activity");
    expect(html).toContain("Check documentation");
  });
});
