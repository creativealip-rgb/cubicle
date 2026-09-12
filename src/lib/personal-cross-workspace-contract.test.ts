import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
describe("personal data crosses workspaces",()=>{
  it("scopes notes by user, not active workspace",()=>{const s=read("src/lib/actions/personal-notes.ts"); expect(s).not.toContain("eq(personalNotes.workspaceId, workspaceId)"); expect(s).toContain("eq(personalNotes.userId, user.id)");});
  it("keeps note origin optional and survives workspace deletion",()=>{const s=read("src/db/schema.ts"); expect(s).toContain('workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" })');});
  it("labels planning without budgeting formula in the title",()=>{const nav=read("src/lib/navigation/app-navigation.ts"); const page=read("src/app/(app)/app/planning/page.tsx"); expect(nav).toContain('en: "Planning"'); expect(page).toContain('title={t("Planning", "Planning")}');});
});
