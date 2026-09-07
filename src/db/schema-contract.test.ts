import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("auth foundation schema contracts", () => {
  it("matches trusted-device index predicate from migration", () => {
    const schema = readFileSync(resolve(process.cwd(), "src/db/schema.ts"), "utf8");
    expect(schema).toContain("index(\"auth_trusted_devices_user_active_idx\").on(table.userId, table.expiresAt).where(sql`${table.revokedAt} is null`)");
  });
});
