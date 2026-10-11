import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("compact table header filters",()=>{
 it("moves project filters into table headers",()=>{const page=read("src/app/(app)/app/projects/page.tsx");const table=read("src/components/projects/projects-list-table.tsx");expect(page).toContain("<StatusFilterDropdown");expect(page).not.toContain("<ProjectFilters");expect(table).toContain("TableHeaderFilter");expect(table).toContain('queryKey="clientId"');expect(table).not.toContain('queryKey="status"');expect(table).toContain('queryKey="billingType"');});
 it("uses canonical task tabs, quick filters, and preserves active query filters",()=>{
  const page=read("src/app/(app)/app/tasks/page.tsx");
  const quick=read("src/components/tasks/task-quick-filter-chips.tsx");
  expect(page).not.toContain("<TaskFilters");
  expect(page).toContain("<TaskPageTabs");
  expect(page).not.toContain("<TaskBehaviorTabs");
  expect(page).toContain("<TaskQuickFilterChips");
  for(const key of ["status","priority","projectId","assignee"]){
   expect(page).toContain(`name="${key}"`);
  }
  expect(quick).toContain('searchParams.get("assignee")');
  expect(quick).toContain('searchParams.get("priority")');
  expect(quick).toContain('searchParams.get("status")');
  expect(quick).toContain('next.delete("page")');
  expect(quick).toContain('router.push(`/app/tasks?${next.toString()}`)');
 });
});
