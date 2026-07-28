import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/lib/actions/package-orders.ts"), "utf8");

describe("Package order admin transitions", () => {
  it("requires authenticated workspace authority", () => {
    expect(source).toContain("export async function transitionPackageOrder");
    expect(source).toContain("auth.api.getSession");
    expect(source).toContain("assertWorkspaceWritable");
    expect(source).toContain("eq(packageOrders.workspaceId, workspaceId)");
  });

  it("locks pending order and applies allowed transition atomically", () => {
    expect(source).toContain("db.transaction");
    expect(source).toContain("FOR UPDATE");
    expect(source).toContain('current.status !== "pending"');
    expect(source).toContain('status: parsed.decision === "confirm" ? "confirmed" : "cancelled"');
  });

  it("revalidates admin, project, and portal views", () => {
    expect(source).toContain('revalidatePath("/app/packages")');
    expect(source).toContain("revalidatePath(`/app/projects/${order.projectId}`)");
    expect(source).toContain('revalidatePath("/client-portal/[token]", "page")');
  });
});
