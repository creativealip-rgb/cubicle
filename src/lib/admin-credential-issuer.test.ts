import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/actions/admin/users.ts", "utf8");

describe("admin credential provisioning", () => {
  it("writes Better Auth local credential issuer on create and reset", () => {
    expect(source.match(/issuer: "local:credential"/g)).toHaveLength(2);
    expect(source).toContain('providerId: "credential"');
  });
});
