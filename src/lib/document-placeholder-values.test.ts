import { describe, expect, it } from "vitest";
import {
  buildContractPlaceholderValues,
  buildProposalPlaceholderValues,
} from "@/lib/document-placeholder-values";
import { resolveDocumentPlaceholders } from "@/lib/document-placeholders";

const NOW = new Date("2026-08-12T00:00:00Z");

const baseSource = {
  clientName: "Alip",
  clientEmail: "alip@example.com",
  companyName: "PT Kopi Senja",
  validUntil: "2026-09-12",
  workspaceName: "Studio Senja",
  workspaceAddress: "Jl. Senja No. 1",
};

describe("buildProposalPlaceholderValues", () => {
  it("maps recipient, company, dates, and workspace fields", () => {
    const values = buildProposalPlaceholderValues(
      { ...baseSource, proposalNumber: "PROP-2026-0001" },
      NOW,
    );
    expect(resolveDocumentPlaceholders(
      "{{client_name}} | {{client_email}} | {{company_name}} | {{proposal_number}} | {{valid_until}} | {{workspace_name}} | {{workspace_address}}",
      values,
    )).toBe("Alip | alip@example.com | PT Kopi Senja | PROP-2026-0001 | 12 September 2026 | Studio Senja | Jl. Senja No. 1");
  });

  it("omits proposal_number when absent so the token stays visible (not silently emptied)", () => {
    const values = buildProposalPlaceholderValues(baseSource, NOW);
    expect(values).not.toHaveProperty("proposal_number");
    expect(resolveDocumentPlaceholders("{{proposal_number}}", values)).toBe("{{proposal_number}}");
  });

  it("normalizes missing recipient fields to empty strings", () => {
    const values = buildProposalPlaceholderValues({}, NOW);
    expect(values).toMatchObject({
      client_name: "",
      client_email: "",
      company_name: "",
      valid_until: "",
      workspace_name: "",
      workspace_address: "",
    });
  });
});

describe("buildContractPlaceholderValues", () => {
  it("maps contract number and contract date", () => {
    const values = buildContractPlaceholderValues(
      {
        ...baseSource,
        contractNumber: "CONT-2026-0001",
        contractDate: "2026-08-01",
      },
      NOW,
    );
    expect(resolveDocumentPlaceholders(
      "{{contract_number}} {{contract_date}}",
      values,
    )).toBe("CONT-2026-0001 1 Agustus 2026");
  });

  it("omits contract_number / contract_date when absent so tokens stay visible", () => {
    const values = buildContractPlaceholderValues(baseSource, NOW);
    expect(values).not.toHaveProperty("contract_number");
    expect(values).not.toHaveProperty("contract_date");
    expect(resolveDocumentPlaceholders("{{contract_number}}", values)).toBe("{{contract_number}}");
  });

  it("accepts a Date object for contract date", () => {
    const values = buildContractPlaceholderValues(
      { ...baseSource, contractDate: new Date("2026-08-01T00:00:00Z") },
      NOW,
    );
    expect(values.contract_date).toBe("1 Agustus 2026");
  });
});

describe("date formatting", () => {
  it("formats id-ID long dates deterministically", () => {
    const values = buildProposalPlaceholderValues({ validUntil: "2026-09-12" }, NOW);
    expect(values.valid_until).toBe("12 September 2026");
  });

  it("returns empty string for invalid or missing dates", () => {
    const values = buildProposalPlaceholderValues({ validUntil: "not-a-date" }, NOW);
    expect(values.valid_until).toBe("");
  });
});
