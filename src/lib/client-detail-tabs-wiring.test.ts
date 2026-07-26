import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  "src/app/(app)/app/clients/[clientId]/page.tsx",
  "utf8",
);

describe("client detail tabs", () => {
  it("uses navigable links so tabs work without client hydration", () => {
    for (const tab of ["projects", "invoices", "calendar", "portal", "notes"]) {
      expect(page).toContain(`href={\`?tab=${tab}\`}`);
    }
  });
});
