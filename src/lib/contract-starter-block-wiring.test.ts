import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const documentBlocks = read("src/lib/document-blocks.ts");

describe("contract starter blocks wiring", () => {
  it("document-blocks.ts defines buildContractStarterBlocks with contract starter content", () => {
    expect(documentBlocks).toMatch(/buildContractStarterBlocks/);
    expect(documentBlocks).toMatch(/Perjanjian Kerja/);
    expect(documentBlocks).toMatch(/contract_number/);
    expect(documentBlocks).toMatch(/Nilai Kontrak/);
  });

  it("buildContractStarterBlocks returns 18 ordered blocks with center-aligned heading, table, and signature", async () => {
    const { buildContractStarterBlocks } = await import("./document-blocks");
    const blocks = buildContractStarterBlocks();
    expect(blocks).toHaveLength(18);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].level).toBe(1);
    expect(blocks[0].align).toBe("center");
    expect(blocks.some((block) => block.type === "table")).toBe(true);
    expect(blocks.some((block) => block.type === "signature")).toBe(true);
  });
});
