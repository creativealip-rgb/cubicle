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
    const reusable = read("src/components/tasks/reusable-task-workspace.tsx");
    expect(clientPage).toContain("Kalender");
    expect(clientPage).not.toContain("> Calendar<");
    expect(reusable).toContain('>Berulang · {row.lifecycle === "active" ? "Aktif" : "Diarsipkan"}</Badge>');
    expect(reusable).toContain('aria-label="Naikkan urutan"');
    expect(reusable).toContain('aria-label="Turunkan urutan"');
  });

  it("gives reusable task title and actions enough desktop width", () => {
    const reusable = read("src/components/tasks/reusable-task-workspace.tsx");
    expect(reusable).toContain("md:grid-cols-[minmax(14rem,1.5fr)_minmax(12rem,1fr)_minmax(9rem,.8fr)_7rem_8rem_minmax(12rem,auto)]");
    expect(reusable).toContain("md:min-w-[72rem]");
  });
});
