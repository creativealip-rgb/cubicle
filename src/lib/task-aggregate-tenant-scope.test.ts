import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(app)/app/tasks/page.tsx", "utf8");

describe("task aggregate tenant scope", () => {
  it("scopes every correlated time entry aggregate to active workspace", () => {
    expect(source.match(/from time_entries te where te\.task_id/g)).toHaveLength(2);
    expect(source.match(/te\.workspace_id = \$\{workspaceId\}/g)).toHaveLength(2);
  });
});
