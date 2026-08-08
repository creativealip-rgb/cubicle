import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveClientPortalActive } from "./client-portal-status";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("live QA polish regressions", () => {
  it("uses one portal-active rule for summary and portal panel", () => {
    const incompletePortal = {
      portalEnabled: true,
      portalPasswordHash: null,
      portalTokenRevokedAt: null,
    };
    expect(resolveClientPortalActive(incompletePortal)).toBe(false);

    const clientPage = read("src/app/(app)/app/clients/[clientId]/page.tsx");
    const portalSection = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");
    expect(clientPage).toContain("resolveClientPortalActive(client)");
    expect(portalSection).toContain("resolveClientPortalActive(client)");
  });

  it("localizes client and reusable-task runtime labels", () => {
    const clientPage = read("src/app/(app)/app/clients/[clientId]/page.tsx");
    const nav = read("src/components/clients/client-tabs-nav.tsx");
    const reusable = read("src/components/tasks/reusable-task-workspace.tsx");
    expect(nav).toContain('t("Kalender", "Calendar")');
    expect(clientPage).not.toContain("> Calendar<");
    expect(reusable).toContain('{t("Berulang", "Recurring")} · {row.lifecycle === "active" ? t("Aktif", "Active") : t("Diarsipkan", "Archived")}');
    expect(reusable).toContain('aria-label="Naikkan urutan"');
    expect(reusable).toContain('aria-label="Turunkan urutan"');
  });

  it("gives reusable task title and actions enough desktop width", () => {
    const reusable = read("src/components/tasks/reusable-task-workspace.tsx");
    expect(reusable).toContain("md:grid-cols-[minmax(12rem,1.5fr)_minmax(10rem,1fr)_minmax(8rem,.8fr)_6rem_7rem_minmax(10rem,auto)]");
    expect(reusable).toContain("md:min-w-[50rem]");
  });
});
