import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProposalStarterBlocks } from "@/lib/document-blocks";
import { buildProposalPlaceholderValues } from "@/lib/document-placeholder-values";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("proposal starter placeholder wiring", () => {
  it("exposes buildProposalStarterBlocks with centered cover and terms section", () => {
    const blocks = read("src/lib/document-blocks.ts");
    expect(blocks).toContain("buildProposalStarterBlocks");
    expect(blocks).toContain('align: "center"');
    expect(blocks).toContain("Syarat & Ketentuan");
  });

  it("builds starter blocks without a manual pricing table (pricing lives in the form)", () => {
    const starter = buildProposalStarterBlocks();
    expect(starter.some((block) => block.type === "table")).toBe(false);
    // Placeholder tokens used by the cover and terms resolve later.
    expect(starter.some((block) => block.content?.includes("{{workspace_name}}"))).toBe(true);
    expect(starter.some((block) => block.content?.includes("{{valid_until}}"))).toBe(true);
  });

  it("injects financial placeholder keys into the values module", () => {
    const values = read("src/lib/document-placeholder-values.ts");
    expect(values).toContain("total_amount");
    expect(values).toContain("down_payment");
    expect(values).toContain("today");
  });

  it("buildProposalPlaceholderValues resolves today, subtotal, and total_amount", () => {
    const now = new Date("2026-08-16T10:00:00Z");
    const values = buildProposalPlaceholderValues(
      {
        today: "2026-08-16",
        subtotal: 1250000,
        tax: "137500",
        total: 1387500,
        downPaymentAmount: 500000,
        proposalNumber: "PRJ-001",
      },
      now,
    );
    // String `today` passes through verbatim; Date `today` is id-ID formatted.
    expect(values.today).toBe("2026-08-16");
    expect(values.subtotal).toBe("1250000");
    expect(values.tax).toBe("137500");
    expect(values.total_amount).toBe("1387500");
    expect(values.down_payment).toBe("500000");
    expect(values.proposal_number).toBe("PRJ-001");
  });

  it("formats a Date `today` via formatIdDate", () => {
    const values = buildProposalPlaceholderValues(
      { today: new Date("2026-08-16T10:00:00Z") },
      new Date("2026-08-16T10:00:00Z"),
    );
    expect(values.today).toBe("16 Agustus 2026");
  });

  it("keeps proposal_number absent when no number is provided", () => {
    const values = buildProposalPlaceholderValues({ today: "2026-08-16" }, new Date("2026-08-16T10:00:00Z"));
    expect(values.proposal_number).toBeUndefined();
    expect(values.today).toBe("2026-08-16");
    expect(values.subtotal).toBe("");
  });
});
