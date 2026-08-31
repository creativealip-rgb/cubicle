import { describe, expect, it } from "vitest";
import { decideMfaPolicy, isMfaRouteAllowed, type MfaPolicyInput } from "./policy";

const base: MfaPolicyInput = {
  enabled: true,
  isNewUser: false,
  enrolled: false,
  graceDeadline: new Date("2026-09-10T00:00:00Z"),
  now: new Date("2026-09-01T00:00:00Z"),
  route: "/dashboard",
};

describe("decideMfaPolicy", () => {
  it("allows everything when rollout disabled", () => {
    expect(decideMfaPolicy({ ...base, enabled: false }).action).toBe("allow");
  });
  it("requires enrollment for new users", () => {
    expect(decideMfaPolicy({ ...base, isNewUser: true }).action).toBe("enroll");
  });
  it("allows existing users during grace", () => {
    expect(decideMfaPolicy(base).action).toBe("allow");
  });
  it("requires enrollment after grace expires", () => {
    expect(decideMfaPolicy({ ...base, now: new Date("2026-09-10T00:00:00Z") }).action).toBe("enroll");
  });
  it("allows enrolled users", () => {
    expect(decideMfaPolicy({ ...base, enrolled: true }).action).toBe("allow");
  });
  it("keeps setup, logout, and recovery routes reachable", () => {
    for (const route of ["/mfa/setup", "/logout", "/mfa/recovery"]) {
      expect(isMfaRouteAllowed(route)).toBe(true);
      expect(decideMfaPolicy({ ...base, route }).action).toBe("allow");
    }
  });
  it("does not vary by Google or password sign-in", () => {
    expect(decideMfaPolicy({ ...base, authMethod: "google" }).action).toBe("allow");
    expect(decideMfaPolicy({ ...base, authMethod: "password" }).action).toBe("allow");
  });
  it("allows public routes without enrollment", () => {
    expect(decideMfaPolicy({ ...base, route: "/login" }).action).toBe("allow");
  });
});

describe("isMfaRouteAllowed", () => {
  it("does not allow arbitrary protected routes", () => {
    expect(isMfaRouteAllowed("/dashboard")).toBe(false);
  });
});
