import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = readFileSync("src/components/files/file-list.tsx", "utf8");
const support = readFileSync("src/app/(app)/app/support/support-client.tsx", "utf8");

describe("search input accessibility", () => {
  it("names file and support search fields", () => {
    expect(files).toContain('aria-label={t("Cari folder dan file", "Search folders and files")}');
    expect(support).toContain('aria-label={t("Cari tiket dukungan", "Search support tickets")}');
  });
});
