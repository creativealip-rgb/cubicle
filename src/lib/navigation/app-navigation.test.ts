import { describe, expect, it } from "vitest";
import {
  appNavigation,
  formatSidebarBadge,
  getActiveNavigation,
  getVisibleNavigation,
  groupHasNotification,
} from "./app-navigation";

function allRoutes() {
  return appNavigation.flatMap((entry) =>
    entry.kind === "group" ? entry.children.map((child) => child.href) : [entry.href],
  );
}

describe("app navigation registry", () => {
  it("contains every visible route exactly once", () => {
    const routes = allRoutes();
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toEqual([
      "/app/dashboard", "/app/clients", "/app/projects", "/app/packages", "/app/tasks",
      "/app/time", "/app/calendar", "/app/files", "/app/invoices",
      "/app/expenses", "/app/reports", "/app/personal",
      "/app/journal", "/app/personal-site", "/app/brain", "/app/prompts",
    ]);
  });

  it("keeps work hierarchy and direct tools", () => {
    const work = appNavigation.find((entry) => entry.id === "work");
    expect(work?.kind).toBe("group");
    if (work?.kind === "group") expect(work.children.map((item) => item.id)).toEqual(["clients", "projects", "services", "tasks"]);
    expect(appNavigation.filter((entry) => entry.kind === "direct").map((entry) => entry.id)).toEqual(["dashboard", "time", "calendar", "files"]);
  });

  it("hides personal from members and viewers including children", () => {
    expect(getVisibleNavigation("owner").some((entry) => entry.id === "personal")).toBe(true);
    for (const role of ["member", "viewer"] as const) {
      const visible = getVisibleNavigation(role);
      expect(visible.some((entry) => entry.id === "personal")).toBe(false);
      expect(JSON.stringify(visible)).not.toContain("/app/personal");
    }
  });

  it.each([
    ["/app/projects/abc", "work", "projects"],
    ["/app/clients/abc", "work", "clients"],
    ["/app/invoices/abc", "finance", "invoices"],
    ["/app/brain", "ai", "assistant"],
    ["/app/time", null, "time"],
  ])("maps %s to active parent and child", (path, groupId, itemId) => {
    expect(getActiveNavigation(path)).toEqual({ groupId, itemId });
  });

  it("does not map hidden sales routes", () => {
    for (const path of ["/app/proposals/1", "/app/contracts", "/app/templates", "/app/questionnaires"]) {
      expect(getActiveNavigation(path)).toEqual({ groupId: null, itemId: null });
    }
  });

  it("caps badges and derives parent dots without totals", () => {
    expect(formatSidebarBadge(100)).toBe("99+");
    expect(formatSidebarBadge(8)).toBe("8");
    expect(groupHasNotification("work", { myOpenTasks: 3 })).toBe(true);
    expect(groupHasNotification("finance", { unpaidInvoices: 0 })).toBe(false);
    expect(groupHasNotification("ai", { myOpenTasks: 3, unpaidInvoices: 4 })).toBe(false);
  });

  it("has ID and EN labels and descriptions", () => {
    for (const entry of appNavigation) {
      expect(entry.label.id).toBeTruthy();
      expect(entry.label.en).toBeTruthy();
      if (entry.kind === "group") for (const child of entry.children) {
        expect(child.label.id).toBeTruthy();
        expect(child.label.en).toBeTruthy();
        expect(child.description?.id).toBeTruthy();
        expect(child.description?.en).toBeTruthy();
      }
    }
  });
});
