import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("project edit human errors", () => {
  it("returns billing lock as typed result", () => {
    const actions = read("src/lib/actions/projects.ts");
    expect(actions).toContain('code: "BILLING_MODEL_LOCKED"');
    expect(actions).toContain("Perubahan lain tetap dapat disimpan");
  });

  it("locks billing selector with human helper copy", () => {
    const form = read("src/components/forms/project-form.tsx");
    expect(form).toContain("billingModelLocked?: boolean");
    expect(form).toContain("disabled={billingModelLocked}");
    expect(form).toContain("Model tagihan dikunci");
  });

  it("passes server-derived lock state to edit form", () => {
    const page = read("src/app/(app)/app/projects/[projectId]/page.tsx");
    const dialog = read("src/components/projects/project-edit-dialog.tsx");
    expect(page).toContain("billingModelLocked=");
    expect(dialog).toContain("billingModelLocked: boolean");
  });
});
