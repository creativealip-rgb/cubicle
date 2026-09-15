import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/components/time/time-route-content.tsx", "utf8");
const dialog = readFileSync("src/components/time/add-time-log-dialog.tsx", "utf8");

describe("time task template context", () => {
  it("passes template source names into grouped manual time task picker", () => {
    expect(route).toContain("templateName:");
    expect(route).toContain("templateItemSourceId");
    expect(dialog).toContain("groupedTaskOptions.map(([templateName, group])");
    expect(dialog).toContain("task.templateName");
  });
});
