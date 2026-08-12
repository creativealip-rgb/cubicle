import { describe, expect, it } from "vitest";
import {
  buildContractNumber,
  buildProposalNumber,
  contractNumberSequence,
  currentDocumentYear,
  isAutoDocumentNumber,
  nextDocumentSequence,
  proposalNumberSequence,
} from "@/lib/document-numbers";

describe("document number builders", () => {
  it("builds PROP-YYYY-#### numbers", () => {
    expect(buildProposalNumber(2026, 1)).toBe("PROP-2026-0001");
    expect(buildProposalNumber(2026, 42)).toBe("PROP-2026-0042");
    expect(buildProposalNumber(2026, 12345)).toBe("PROP-2026-12345");
  });

  it("builds CONT-YYYY-#### numbers", () => {
    expect(buildContractNumber(2026, 1)).toBe("CONT-2026-0001");
    expect(buildContractNumber(2027, 999)).toBe("CONT-2027-0999");
  });

  it("detects auto-generated numbers", () => {
    expect(isAutoDocumentNumber("PROP-2026-0001")).toBe(true);
    expect(isAutoDocumentNumber("CONT-2026-0001")).toBe(true);
    expect(isAutoDocumentNumber("PROP-2026-001")).toBe(false); // < 4 digits
    expect(isAutoDocumentNumber("INV-0001")).toBe(false);
    expect(isAutoDocumentNumber("manual-number")).toBe(false);
    expect(isAutoDocumentNumber("")).toBe(false);
  });

  it("currentDocumentYear uses the provided clock", () => {
    expect(currentDocumentYear(new Date("2026-08-12T00:00:00Z"))).toBe(2026);
  });
});

describe("nextDocumentSequence", () => {
  it("starts at 1 when no counter and no existing numbers", () => {
    expect(nextDocumentSequence(null, [], proposalNumberSequence)).toBe(1);
  });

  it("respects the counter row", () => {
    expect(nextDocumentSequence(5, [], proposalNumberSequence)).toBe(5);
  });

  it("bumps above the max existing sequence (seed/manual rows)", () => {
    expect(nextDocumentSequence(
      1,
      ["PROP-2026-0042", "PROP-2026-0007", null, undefined],
      proposalNumberSequence,
    )).toBe(43);
  });

  it("ignores numbers that do not match the series", () => {
    expect(nextDocumentSequence(
      1,
      ["manual-number", "INV-0001", "PROP-2025-001"],
      proposalNumberSequence,
    )).toBe(1);
  });

  it("works for contract series independently", () => {
    expect(nextDocumentSequence(1, ["CONT-2026-0099", "PROP-2026-0001"], contractNumberSequence)).toBe(100);
  });
});

describe("sequence extractors", () => {
  it("extracts proposal sequences", () => {
    expect(proposalNumberSequence("PROP-2026-0042")).toBe(42);
    expect(proposalNumberSequence("CONT-2026-0001")).toBeNull();
    expect(proposalNumberSequence("PROP-2026-0001 ")).toBe(1); // tolerant of spaces
  });

  it("extracts contract sequences", () => {
    expect(contractNumberSequence("CONT-2026-0042")).toBe(42);
    expect(contractNumberSequence("PROP-2026-0001")).toBeNull();
    expect(contractNumberSequence("CONT-2026-00001")).toBe(1);
  });
});
