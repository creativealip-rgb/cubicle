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

  it("pins overview actions to aligned card footers", () => {
    const overview = readFileSync("src/components/clients/client-overview.tsx", "utf8");
    expect(overview).toContain('<Card className="h-full rounded-xl">');
    expect(overview).toContain('<CardContent className="flex h-full flex-col p-4">');
    expect(overview).toContain('<div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 border-t pt-3">');
  });

  it("uses compact embedded empty states without duplicate center actions", () => {
    expect(source).toContain("<EmptyState");
    expect(source).toContain("icon={FolderKanban}");
    expect(source).toContain("icon={Receipt}");
    expect(source).toContain('description={t("Buat project pertama untuk mulai mengatur pekerjaan klien ini.", "Create the first project to organize this client\'s work.")}');
    expect(source).toContain('description={t("Buat invoice pertama saat pekerjaan klien ini siap ditagihkan.", "Create the first invoice when this client\'s work is ready to bill.")}');
    expect(source).toContain("embedded");
  });
});
