import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const proposalPdf = read("src/components/proposals/proposal-pdf.tsx");
const contractPdf = read("src/components/contracts/contract-pdf.tsx");
const renderer = read("src/lib/document-block-renderer.tsx");

describe("proposal/contract render financial placeholder wiring", () => {
  it("proposal PDF injects today, subtotal, tax, total_amount and down_payment placeholder values", () => {
    expect(proposalPdf).toContain("total_amount");
    expect(proposalPdf).toContain("down_payment");
    expect(proposalPdf).toContain("today");
    expect(proposalPdf).toContain("subtotal");
    expect(proposalPdf).toContain("tax");
    expect(proposalPdf).toContain("total_amount: total");
    expect(proposalPdf).toContain("down_payment: dpAmount");
  });

  it("proposal PDF keeps the block.align textAlign pattern on body blocks", () => {
    expect(proposalPdf).toContain("...(block.align ? [{ textAlign: block.align");
  });

  it("contract PDF injects total_amount placeholder value", () => {
    expect(contractPdf).toContain("total_amount");
    expect(contractPdf).toContain("down_payment");
    expect(contractPdf).toContain("today");
    expect(contractPdf).toContain("buildContractPlaceholderValues");
    expect(contractPdf).toContain("renderDocumentBlock(block, placeholderValues)");
  });

  it("contract PDF keeps the block.align textAlign pattern on body blocks", () => {
    expect(contractPdf).toContain("...(block.align ? [{ textAlign: block.align");
  });

  it("document block renderer applies block.align to heading/text/placeholder/list/table output", () => {
    expect(renderer).toContain("textAlignClass");
    // heading/text/placeholder fallback wrapper
    expect(renderer).toContain("whitespace-pre-wrap");
    expect(renderer).toContain("${textAlignClass}");
    // list blocks (ordered + unordered)
    expect(renderer).toContain("list-decimal");
    expect(renderer).toContain("list-disc");
    // table blocks
    expect(renderer).toContain("overflow-x-auto");
    expect(renderer).toContain(`my-3 overflow-x-auto \${textAlignClass}`);
  });
});
