import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page=readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx","utf8");
const tabs=readFileSync("src/components/clients/client-tabs-nav.tsx","utf8");
const tasks=readFileSync("src/components/tasks/project-task-workspace.tsx","utf8");
describe("client detail overview",()=>{
 it("defaults to overview and keeps portal last",()=>{expect(page).toContain(': "overview";');expect(tabs.indexOf('value="overview"')).toBeLessThan(tabs.indexOf('value="portal"'));});
 it("shows business pulse and quick create",()=>{for(const text of ["trackedMinutes","outstandingTotal","invoicedTotal","ClientHeaderActions"])expect(page).toContain(text);});
 it("removes duplicate project task create",()=>{expect(tasks).not.toContain("createButton");expect(tasks).not.toContain("Create Task");});
});
