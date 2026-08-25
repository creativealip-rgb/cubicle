import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("contract create number", () => {
  it("loads a server-proposed number and submits an editable value", () => {
    const page = read("src/app/(app)/app/contracts/page.tsx");
    const dialog = read("src/components/contracts/create-contract-button.tsx");
    expect(page).toContain("getProposedContractNumber(workspaceId)");
    expect(page).toContain("proposedContractNumber={proposedContractNumber}");
    expect(dialog).toContain('t("Nomor Kontrak", "Contract Number")');
    expect(dialog).toContain("useState(proposedContractNumber)");
    expect(dialog).toContain("contractNumber: contractNumber.trim()");
  });

  it("normalizes and reports workspace duplicates", () => {
    const actions = read("src/lib/actions/contracts.ts");
    expect(actions).toContain("parsed.contractNumber?.trim().toUpperCase()");
    expect(actions).toContain("contracts_workspace_contract_number_unique");
    expect(actions).toContain("Contract number already exists in this workspace");
  });
});
