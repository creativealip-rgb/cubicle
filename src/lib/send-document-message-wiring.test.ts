import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("send document custom message wiring", () => {
  it("lets proposal send dialog edit message and inject proposal link", () => {
    const button = read("src/components/proposals/send-proposal-button.tsx");
    const action = read("src/lib/actions/proposals.ts");

    expect(button).toContain("const [message, setMessage]");
    expect(button).toContain("{{proposal_link}}");
    expect(button).toContain("sendProposal(proposalId, message.trim() || undefined)");
    expect(action).toContain("sendProposal(proposalId: string, customMessage?: string)");
    expect(action).toContain("replace(/\\{\\{proposal_link\\}\\}/g, proposalUrl)");
  });

  it("lets contract send dialog edit message and inject contract link", () => {
    const button = read("src/components/contracts/send-contract-button.tsx");
    const action = read("src/lib/actions/contracts.ts");

    expect(button).toContain("const [message, setMessage]");
    expect(button).toContain("{{contract_link}}");
    expect(button).toContain("sendContract({ contractId, customMessage: message.trim() || undefined })");
    expect(action).toContain("customMessage?: string");
    expect(action).toContain("replace(/\\{\\{contract_link\\}\\}/g, contractUrl)");
  });

  it("keeps compact table send actions text buttons aligned to the right and gives message dialog breathing room", () => {
    const proposalButton = read("src/components/proposals/send-proposal-button.tsx");
    const contractButton = read("src/components/contracts/send-contract-button.tsx");
    const proposalTable = read("src/components/proposals/proposals-list-table.tsx");
    const contractTable = read("src/components/contracts/contracts-list-table.tsx");

    for (const button of [proposalButton, contractButton]) {
      expect(button).toContain('className={compact ? "h-7 px-2 text-xs" : undefined}');
      expect(button).not.toContain('className={compact ? "sr-only" : undefined}');
      expect(button).toContain('DialogContent className="sm:max-w-lg"');
      expect(button).toContain('className="block space-y-2"');
      expect(button).toContain('className="space-y-3 rounded-lg border bg-muted/20 p-3"');
    }

    for (const table of [proposalTable, contractTable]) {
      expect(table).toContain('className="text-right align-middle"');
      expect(table).toContain('className="flex justify-end"');
    }
  });
});
