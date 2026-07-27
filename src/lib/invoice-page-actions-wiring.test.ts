import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/app/invoices/page.tsx", "utf8");

describe("invoice page header actions", () => {
  it("keeps new invoice action without template shortcut", () => {
    expect(page).toContain('href="/app/invoices/new"');
    expect(page).not.toContain('href="/app/templates?tab=invoice"');
  });
});
