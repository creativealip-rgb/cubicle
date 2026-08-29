import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("renders Settings Billing from canonical Billing page", () => {
  const settings = readFileSync("src/app/(app)/app/settings/page.tsx", "utf8");
  expect(settings).toContain('import BillingPage from "@/app/(app)/app/billing/page"');
  expect(settings).toContain('billing={<BillingPage searchParams={Promise.resolve({})} />}');
});

it("canonical Billing page contains plans and add-ons", () => {
  const billing = readFileSync("src/app/(app)/app/billing/page.tsx", "utf8");
  expect(billing).toContain('<TabsTrigger value="plans">');
  expect(billing).toContain('<TabsTrigger value="addons">');
  expect(billing).toContain("<AddonPurchaseControls");
  expect(billing).toContain("<AddonManagement");
});
