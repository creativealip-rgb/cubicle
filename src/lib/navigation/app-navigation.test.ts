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
  it("contains every visible route exactly once in target order", () => {
    const routes = allRoutes();
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toEqual([
      "/app/dashboard", "/app/clients", "/app/projects", "/app/tasks", "/app/time", "/app/calendar",
      "/app/files", "/app/proposals", "/app/contracts", "/app/questionnaires", "/app/services",
      "/app/packages", "/app/templates", "/app/invoices", "/app/expenses", "/app/reports",
      "/app/personal", "/app/journal", "/app/personal-site", "/app/brain", "/app/prompts",
    ]);
    expect(appNavigation.map((entry) => entry.id)).toEqual([
      "dashboard", "work", "time", "calendar", "files", "sales", "finance", "personal", "ai",
    ]);
  });

  it("keeps only delivery entities in Work and moves commercial catalog to Sales", () => {
    const work = appNavigation.find((entry) => entry.id === "work");
    const sales = appNavigation.find((entry) => entry.id === "sales");
    expect(work?.kind).toBe("group");
    expect(sales?.kind).toBe("group");
    if (work?.kind === "group") expect(work.children.map((item) => item.id)).toEqual(["clients", "projects", "tasks"]);
    if (sales?.kind === "group") expect(sales.children.map((item) => item.id)).toEqual([
      "proposals", "contracts", "questionnaires", "services", "packages", "templates",
    ]);
    expect(allRoutes()).not.toContain("/app/activities");
  });

  it("keeps role visibility consistent with existing route capabilities", () => {
    expect(getVisibleNavigation("owner").some((entry) => entry.id === "personal")).toBe(true);
    for (const role of ["member", "viewer"] as const) {
      const visible = getVisibleNavigation(role);
      expect(visible.some((entry) => entry.id === "personal")).toBe(false);
      expect(visible.some((entry) => entry.id === "sales")).toBe(true);
      expect(JSON.stringify(visible)).not.toContain("/app/personal");
    }
  });

  it.each([
    ["/app/projects/abc", "work", "projects"],
    ["/app/clients/abc", "work", "clients"],
    ["/app/services", "sales", "services"],
    ["/app/proposals/abc", "sales", "proposals"],
    ["/app/contracts", "sales", "contracts"],
    ["/app/questionnaires/abc", "sales", "questionnaires"],
    ["/app/templates", "sales", "templates"],
    ["/app/invoice-templates/abc", "sales", "templates"],
    ["/app/contract-templates/new", "sales", "templates"],
    ["/app/invoices/templates", "sales", "templates"],
    ["/app/invoices/templates/abc", "sales", "templates"],
    ["/app/invoices/abc", "finance", "invoices"],
    ["/app/activities", null, "time"],
    ["/app/activities/abc", null, "time"],
    ["/app/time", null, "time"],
    ["/app/time/history", null, "time"],
  ])("maps %s to active parent and child", (path, groupId, itemId) => {
    expect(getActiveNavigation(path)).toEqual({ groupId, itemId });
  });

  it("uses longest specific route across canonical hrefs and aliases", () => {
    expect(getActiveNavigation("/app/invoices/templates")).toEqual({ groupId: "sales", itemId: "templates" });
    expect(getActiveNavigation("/app/invoices/templates/example")).toEqual({ groupId: "sales", itemId: "templates" });
    expect(getActiveNavigation("/app/invoices/example")).toEqual({ groupId: "finance", itemId: "invoices" });
  });

  it("does not match partial path segments", () => {
    expect(getActiveNavigation("/app/projectscope")).toEqual({ groupId: null, itemId: null });
    expect(getActiveNavigation("/app/invoices-template")).toEqual({ groupId: null, itemId: null });
  });

  it("caps badges and derives parent dots without totals", () => {
    expect(formatSidebarBadge(100)).toBe("99+");
    expect(formatSidebarBadge(8)).toBe("8");
    expect(groupHasNotification("work", { myOpenTasks: 3 })).toBe(true);
    expect(groupHasNotification("finance", { unpaidInvoices: 0 })).toBe(false);
    expect(groupHasNotification("sales", { myOpenTasks: 3, unpaidInvoices: 4 })).toBe(false);
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
