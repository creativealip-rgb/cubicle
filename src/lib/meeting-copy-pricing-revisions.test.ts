import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");

describe("meeting copy and pricing revisions",()=>{
  it("uses concise navigation labels",()=>{const nav=read("src/lib/navigation/app-navigation.ts"); expect(nav).toContain('{ id: "Statement", en: "Statement" }'); expect(nav).toContain('{ id: "Planning", en: "Planning" }'); expect(nav).not.toContain("Planning (50/30/20)");});
  it("enforces new AI quotas",()=>{const plan=read("src/lib/plan.ts"); expect(plan).toMatch(/free:[\s\S]*aiRequestsPerMonth: 15/); expect(plan).toMatch(/solo:[\s\S]*aiRequestsPerMonth: 150/);});
  it("keeps pricing copy aligned",()=>{const landing=read("src/app/page.tsx"); const billing=read("src/app/(app)/app/billing/page.tsx"); for(const source of [landing,billing]){expect(source).toContain("15 AI request"); expect(source).toContain("150 AI request"); expect(source).toContain("proposal"); expect(source).toContain("contract"); expect(source).toContain("invoice");} expect(landing).toContain("For freelancers with many clients.");});
  it("adds transparent illustrative social proof",()=>{const landing=read("src/app/page.tsx"); expect(landing).toContain("100+"); expect(landing).toContain("Built for freelancers and creative studios"); expect(landing).toContain('bg-[#F0ECFF]'); expect(landing).toContain("text-4xl"); expect(landing).toContain("Early user stories"); expect(landing).toContain("Illustrative"); expect(landing.match(/<figure key=/g)).toHaveLength(1);});
  it("removes requested implementation copy",()=>{const copy=read("src/components/settings/google-calendar-connect.tsx")+read("src/components/settings/currency-rates-form.tsx")+read("src/components/tasks/task-template-workspace.tsx"); for(const text of ["Google Cloud Console app verification completes","Workspace base currency:","Set manual rates:","Change base currency in Branding & Invoice tab","user_id..."]) expect(copy).not.toContain(text);});
});
