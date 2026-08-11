import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("billing checkout status wiring", () => {
  it("scopes status lookup to current workspace owner and order", () => {
    const source = read("src/lib/billing-checkout-status.ts");
    expect(source.indexOf('member?.role !== "owner"')).toBeLessThan(source.indexOf(".from(pakasirPayments)"));
    expect(source).toContain("eq(pakasirPayments.orderId, params.orderId)");
    expect(source).toContain("eq(pakasirPayments.workspaceId, params.workspaceId)");
    expect(source).not.toContain("rawPayload");
  });

  it("reads checkout query and renders bilingual status card", () => {
    const page = read("src/app/(app)/app/billing/page.tsx");
    const card = read("src/components/billing/billing-checkout-status-card.tsx");
    expect(page).toContain('searchParams: Promise<{ checkout?: string }>');
    expect(page).toContain("getCheckoutStatusForWorkspaceOwner");
    expect(page).toContain("<BillingCheckoutStatusCard");
    expect(card).toContain('Payment pending');
    expect(card).toContain('Menunggu pembayaran');
    expect(card).not.toContain("rawPayload");
  });
});
