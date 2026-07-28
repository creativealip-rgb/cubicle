import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("restricted app route wiring", () => {
  it("guards private pages before data loading", () => {
    for (const path of [
      "src/app/(app)/app/personal/page.tsx",
      "src/app/(app)/app/personal-site/page.tsx",
      "src/app/(app)/app/templates/page.tsx",
    ]) {
      expect(read(path)).toContain("requireWorkspaceOwnerOrRedirect");
    }
  });

  it("redirects viewers from writable-only pages before protected UI or data", () => {
    const routes = {
      "src/app/(app)/app/invoices/new/page.tsx": "const clientOptions",
      "src/app/(app)/app/proposals/new/page.tsx": "const ws =",
      "src/app/(app)/app/questionnaires/new/page.tsx": "return (",
    };
    for (const [path, protectedContent] of Object.entries(routes)) {
      const page = read(path);
      const functionBody = page.slice(page.indexOf("export default"));
      const guard = functionBody.indexOf("requireWorkspaceWritableOrRedirect");
      expect(guard).toBeGreaterThan(-1);
      expect(guard).toBeLessThan(functionBody.indexOf(protectedContent));
      expect(page).not.toContain("assertWorkspaceWritable");
    }
  });
});
