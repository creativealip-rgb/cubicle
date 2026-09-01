import { describe, expect, it } from "vitest";
import { canApproveRecovery, canExecuteRecovery, recoveryCoolingUntil } from "./manual-recovery-policy";

describe("manual recovery policy", () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  const base = { createdAt, coolingUntil: recoveryCoolingUntil(createdAt), approvals: [], requesterId: "user", status: "pending" as const };
  it("blocks before 72 hours", () => expect(canExecuteRecovery({ ...base, approvals: ["a", "b"] }, new Date("2026-01-03T23:59:59Z"))).toBe(false));
  it("requires distinct admins", () => expect(canApproveRecovery({ ...base, approvals: ["a"] }, "a", new Date("2026-01-04T00:00:00Z"))).toBe(false));
  it("allows execution after cooling and two approvals", () => expect(canExecuteRecovery({ ...base, approvals: ["a", "b"] }, new Date("2026-01-04T00:00:00Z"))).toBe(true));
});
