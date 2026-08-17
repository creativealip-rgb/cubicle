import { describe, expect, it } from "vitest";
import { getAdminRewritePath } from "./host-routing";

describe("getAdminRewritePath (admin host transparent rewrite)", () => {
  it("maps / to the admin dashboard", () => {
    expect(getAdminRewritePath("/")).toBe("/admin/dashboard");
  });

  it("passes through canonical /admin paths", () => {
    expect(getAdminRewritePath("/admin/dashboard")).toBe("/admin/dashboard");
    expect(getAdminRewritePath("/admin/users")).toBe("/admin/users");
    expect(getAdminRewritePath("/admin")).toBe("/admin/dashboard");
    expect(getAdminRewritePath("/admin/")).toBe("/admin/dashboard");
  });

  it("maps bare control-plane paths to the (admin) route group", () => {
    expect(getAdminRewritePath("/users")).toBe("/admin/users");
    expect(getAdminRewritePath("/workspaces")).toBe("/admin/workspaces");
    expect(getAdminRewritePath("/payments")).toBe("/admin/payments");
    expect(getAdminRewritePath("/audit")).toBe("/admin/audit");
  });

  it("maps /app/* (post-login landing) to the admin route group, not /admin/app/*", () => {
    expect(getAdminRewritePath("/app/dashboard")).toBe("/admin/dashboard");
    expect(getAdminRewritePath("/app/users")).toBe("/admin/users");
    expect(getAdminRewritePath("/app")).toBe("/admin/dashboard");
    expect(getAdminRewritePath("/app/")).toBe("/admin/dashboard");
  });

  it("passes auth paths through unrewritten so /login renders", () => {
    for (const p of ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/verify-email/success"]) {
      expect(getAdminRewritePath(p)).toBe(p);
    }
  });
});
