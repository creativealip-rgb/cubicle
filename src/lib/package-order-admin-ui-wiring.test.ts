import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("Package order admin UI", () => {
  it("loads workspace-scoped orders on packages page", () => {
    const page = read("src/app/(app)/app/packages/page.tsx");
    const actions = read("src/lib/actions/package-orders.ts");
    expect(page).toContain("getWorkspacePackageOrders()");
    expect(page).toContain("<PackageOrderAdminPanel orders={orders.map");
    expect(actions).toContain("export async function getWorkspacePackageOrders");
    expect(actions).toContain("eq(packageOrders.workspaceId, workspaceId)");
  });

  it("renders terminal actions only for pending orders", () => {
    const panel = read("src/components/packages/package-order-admin-panel.tsx");
    expect(panel).toContain('order.status === "pending"');
    expect(panel).toContain('decide(order.id, "confirm")');
    expect(panel).toContain('decide(order.id, "cancel")');
    expect(panel).toContain("transitionPackageOrder");
  });
});
