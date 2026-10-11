import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("renders Settings tab shell with invoice/billing section", () => {
  const settings = readFileSync("src/app/(app)/app/settings/page.tsx", "utf8");
  const tabs = readFileSync("src/components/settings/settings-tabs.tsx", "utf8");
  expect(settings).toContain("<SettingsTabs");
  expect(tabs).toContain('key: "invoice"');
});

it("canonical Billing page contains plans and add-ons", () => {
  const billing = readFileSync("src/app/(app)/app/billing/page.tsx", "utf8");
  const tabsNav = readFileSync("src/components/billing/billing-tabs-nav.tsx", "utf8");
  expect(billing).toContain("<BillingTabsNav");
  expect(tabsNav).toContain('"plans"');
  expect(tabsNav).toContain('"addons"');
  expect(billing).toContain("<AddonPurchaseControls");
  expect(billing).toContain("<AddonManagement");
});
