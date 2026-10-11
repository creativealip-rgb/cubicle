import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("public document terminal edges", () => {
  it("rejects proposal accept after decline and decline after accept", () => {
    const actions = read("src/lib/actions/proposals.ts");
    expect(actions).toContain('processedStatuses: ["declined"]');
    expect(actions).toContain('processedStatuses: ["accepted"]');
    expect(actions).toContain('if (p.status === "declined") return { id: proposalId, alreadyDeclined: true }');
  });

  it("rejects contract sign after decline and decline after sign", () => {
    const actions = read("src/lib/actions/contracts.ts");
    expect(actions).toContain('processedStatuses: ["declined"]');
    expect(actions).toContain('processedStatuses: ["signed"]');
    expect(actions).toContain('if (locked.status === "signed") throw new Error("Contract already signed")');
  });

  it("serializes form limit checks with response insertion", () => {
    const actions = read("src/lib/actions/questionnaires.ts");
    expect(actions).toMatch(/db\.transaction[\s\S]*\.for\("update"\)[\s\S]*count >= qMaster\.maxResponses[\s\S]*tx\s*\.insert\(questionnaireResponses\)/);
  });
});
