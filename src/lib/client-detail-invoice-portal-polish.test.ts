import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const page = read("src/app/(app)/app/clients/[clientId]/page.tsx");
const portal = read("src/app/(app)/app/clients/[clientId]/portal-section.tsx");

describe("Client Invoice and Portal polish", () => {
  it("localizes Invoice status and formats amount with shared helper", () => {
    expect(page).toContain("invoiceStatusLabel");
    expect(page).toContain("formatMoney(inv.total, inv.currency)");
    expect(page).not.toContain("{inv.status}");
    expect(page).not.toContain("{inv.currency} {inv.total}");
  });

  it("gives Portal icon controls accessible names", () => {
    expect(portal).toContain('aria-label="Salin link portal"');
    expect(portal).toContain('aria-label="Buka portal klien"');
    expect(portal).toContain('title="Salin link portal"');
    expect(portal).toContain('title="Buka portal klien"');
  });
});
