import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/page.tsx", "utf8");

it("keeps every landing pricing entitlement bilingual", () => {
  for (const [id, en] of [
    ["1 pengguna", "1 user"],
    ["3 klien", "3 clients"],
    ["5 proyek", "5 projects"],
    ["10 invoice/bulan", "10 invoices/month"],
    ["Portal klien + AI", "Client portal + AI"],
    ["1 workspace Solo", "1 Solo workspace"],
    ["Hingga 5 anggota/workspace", "Up to 5 members/workspace"],
    ["Hingga 3 workspace", "Up to 3 workspaces"],
    ["Peran tim", "Team roles"],
  ]) {
    expect(source).toContain(`"${id}": "${en}"`);
  }
  expect(source).not.toContain("Existing Solo workspace rule");
});
