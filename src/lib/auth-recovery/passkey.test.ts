import { describe, expect, it } from "vitest";
import fs from "node:fs";
const start=fs.readFileSync("src/app/api/auth/recovery/passkey/start/route.ts","utf8"),verify=fs.readFileSync("src/app/api/auth/recovery/passkey/verify/route.ts","utf8");
describe("passkey recovery wiring",()=>{it("requires user verification and bounded one-time challenge",()=>{expect(start).toContain('userVerification: "required"');expect(start).toContain("5 * 60_000");expect(verify).toContain("requireUserVerification: true");expect(verify).toContain("isNull(authRecoveryHandoffs.consumedAt)");});it("pins production origin/RP and updates authenticator counter",()=>{expect(verify).toContain('"https://app.cubiqlo.com"');expect(verify).toContain('"app.cubiqlo.com"');expect(verify).toContain("newCounter");});});
