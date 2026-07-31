import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/lib/actions/proposals.ts"), "utf8");

describe("proposal Project Service generation", () => {
  it("accepts Project IDs and resolves active Project Service snapshots server-side", () => {
    expect(source).toContain("projectIds: z.array(z.string().uuid()).optional()");
    expect(source).toContain("projectServices");
    expect(source).toContain("buildProjectServiceDocumentLines");
    expect(source).toContain('eq(projectServices.status, "active")');
    expect(source).toContain("eq(projects.clientId, parsed.clientId)");
  });

  it("combines generated snapshot lines with manual proposal lines", () => {
    expect(source).toContain("generatedLineItems");
    expect(source).toContain("...parsed.lineItems");
    expect(source).toContain("...generatedLineItems");
  });
});
