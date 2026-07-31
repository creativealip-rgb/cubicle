import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("compact table header filters",()=>{
 it("moves project filters into table headers",()=>{const page=read("src/app/(app)/app/projects/page.tsx");const table=read("src/components/projects/projects-list-table.tsx");expect(page).not.toContain("<StatusFilterTabs");expect(page).not.toContain("<ProjectFilters");expect(table).toContain("TableHeaderFilter");expect(table).toContain('queryKey="clientId"');expect(table).toContain('queryKey="status"');expect(table).toContain('queryKey="billingType"');});
 it("moves task filters into headers but preserves behavior tabs and view toggle",()=>{const page=read("src/app/(app)/app/tasks/page.tsx");const table=read("src/components/tasks/tasks-list-table.tsx");expect(page).not.toContain("<TaskFilters");expect(page).toContain("<TaskBehaviorTabs");expect(page).toContain("<TaskViewToggle");for(const key of ["projectId","assignee","priority","status"])expect(table).toContain(`queryKey="${key}"`);});
});
