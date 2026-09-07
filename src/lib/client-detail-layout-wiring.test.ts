import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx", "utf8");

describe("client detail overview layout", () => {
  it("keeps overview and full-width work tabs", () => {
    expect(source).toContain("<ClientOverview");
    expect(source).toContain("<section className=\"mt-4 min-w-0\">");
    expect(source).toContain("overviewContent=");
  });

  it("keeps core client info inside the profile column", () => {
    const overview = readFileSync("src/components/clients/client-overview.tsx", "utf8");
    expect(overview).toContain("Proyek Aktif");
    expect(overview).toContain("Belum Dibayar");
    expect(overview).toContain("Catatan Internal");
    expect(source).toContain("ClientEditDialog");
  });
});
