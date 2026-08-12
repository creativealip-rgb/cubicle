import { describe, expect, it } from "vitest";
import { resolveDocumentPlaceholders } from "@/lib/document-placeholders";

describe("resolveDocumentPlaceholders", () => {
  it("replaces known placeholders and preserves unknown ones", () => {
    expect(
      resolveDocumentPlaceholders("Hi {{client_name}} {{contract_number}} {{missing}}", {
        client_name: "Alip",
        contract_number: "CONT-2026-0001",
      }),
    ).toBe("Hi Alip CONT-2026-0001 {{missing}}");
  });

  it("normalizes missing values to empty text", () => {
    expect(resolveDocumentPlaceholders("{{company_name}}", { company_name: null })).toBe("");
  });
});
