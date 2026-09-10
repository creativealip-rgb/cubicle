import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/actions/questionnaires.ts", "utf8");

describe("public questionnaire activity logging", () => {
  it("does not put a public respondent email into users.id foreign key", () => {
    expect(source).toContain('writeActivityLog(resp.workspaceId, null, "submitted_questionnaire"');
    expect(source).toContain("respondentEmail: resp.respondentEmail");
    expect(source).not.toContain('writeActivityLog(resp.workspaceId, resp.respondentEmail || "anonymous"');
  });
});
