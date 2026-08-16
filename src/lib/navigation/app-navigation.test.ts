import { describe, expect, it } from "vitest";
import {
  appNavigation,
  formatSidebarBadge,
  getActiveNavigation,
  getVisibleNavigation,
  groupHasNotification,
} from "./app-navigation";

function allRoutes() {
  return appNavigation.flatMap((entry) => entry.kind === "group" ? entry.children.map((item) => item.href) : [entry.href]);
}

describe("app navigation registry", () => {
  it("keeps primary navigation focused and route-unique", () => {
    const routes = allRoutes();
    expect(new Set(routes).size).toBe(routes.length);
    expect(appNavigation.map((entry) => entry.id)).toEqual([
      "dashboard", "work", "time", "business", "calendar", "files", "finance", "personal", "ai",
    ]);
    expect(routes).toContain("/app/services");
    expect(routes).toContain("/app/proposals");
    expect(routes).not.toContain("/app/packages");
  });

  it("keeps only delivery entities in Work", () => {
    const work = appNavigation.find((entry) => entry.id === "work");
    expect(work?.kind).toBe("group");
    if (work?.kind === "group") expect(work.children.map((item) => item.id)).toEqual(["clients", "projects", "tasks"]);
    expect(appNavigation.some((entry) => entry.id === "sales")).toBe(false);
  });

  it("hides Personal from member and viewer", () => {
    for (const role of ["member", "viewer"] as const) {
      const visible = getVisibleNavigation(role);
      expect(visible.some((entry) => entry.id === "personal")).toBe(false);
      expect(visible.some((entry) => entry.id === "sales")).toBe(false);
      expect(JSON.stringify(visible)).not.toContain("/app/personal");
    }
  });

  it.each([
    ["/app/projects/abc", "work", "projects"],
    ["/app/clients/abc", "work", "clients"],
    ["/app/invoices/abc", "finance", "invoices"],
    ["/app/activities", null, "time"],
    ["/app/activities/abc", null, "time"],
  ])("maps %s to active navigation", (path, groupId, itemId) => {
    expect(getActiveNavigation(path)).toEqual({ groupId, itemId });
  });

  it("maps business routes to active navigation", () => {
    expect(getActiveNavigation("/app/services")).toEqual({ groupId: "business", itemId: "services" });
    expect(getActiveNavigation("/app/proposals/abc")).toEqual({ groupId: "business", itemId: "proposals" });
    expect(getActiveNavigation("/app/contracts/abc")).toEqual({ groupId: "business", itemId: "contracts" });
    expect(getActiveNavigation("/app/templates")).toEqual({ groupId: "business", itemId: "templates" });
  });

  it("keeps finance longest-prefix behavior", () => {
    expect(getActiveNavigation("/app/invoices/templates")).toEqual({ groupId: "finance", itemId: "invoices" });
    expect(getActiveNavigation("/app/invoices/example")).toEqual({ groupId: "finance", itemId: "invoices" });
  });

  it("formats badges and parent notifications", () => {
    expect(formatSidebarBadge(8)).toBe("8");
    expect(formatSidebarBadge(120)).toBe("99+");
    expect(groupHasNotification("work", { myOpenTasks: 3 })).toBe(true);
    expect(groupHasNotification("finance", { unpaidInvoices: 0 })).toBe(false);
  });

  it("has ID and EN labels and descriptions", () => {
    for (const entry of appNavigation) {
      expect(entry.label.id).toBeTruthy();
      expect(entry.label.en).toBeTruthy();
      if (entry.kind === "group") for (const child of entry.children) {
        expect(child.label.id).toBeTruthy();
        expect(child.label.en).toBeTruthy();
      }
    }
  });
});
