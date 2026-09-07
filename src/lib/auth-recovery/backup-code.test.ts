import { describe, expect, it } from "vitest";
import { consumeBackupCode } from "./backup-code";
describe("backup code recovery", () => {
  it("consumes exactly one Better Auth JSON code", () => {
    expect(
      consumeBackupCode('["AAAAA-BBBBB","CCCCC-DDDDD"]', "AAAAA-BBBBB"),
    ).toEqual({ ok: true, encoded: '["CCCCC-DDDDD"]' });
  });
  it("rejects malformed and replayed codes", () => {
    expect(consumeBackupCode("bad", "AAAAA-BBBBB")).toEqual({ ok: false });
    expect(consumeBackupCode('["CCCCC-DDDDD"]', "AAAAA-BBBBB")).toEqual({
      ok: false,
    });
  });
});
