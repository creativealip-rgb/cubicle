import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const pakasirSync = () => read("scripts/cron-pakasir-sync.sh");
const expirePlans = () => read("scripts/cron-expire-plans.sh");
const envLocal = () => {
  try {
    return read(".env.development.local");
  } catch {
    return "";
  }
};

describe("billing recovery cron scheduler wiring", () => {
  it("pakasir-sync targets /api/cron/pakasir-sync and authenticates with the shared CRON_SECRET bearer token", () => {
    const src = pakasirSync();
    expect(src).toContain("/api/cron/pakasir-sync");
    expect(src).toContain("load_env_key CRON_SECRET");
    expect(src).toContain(": \"${CRON_SECRET:?CRON_SECRET not set in env}\"");
    expect(src).toContain("Authorization: Bearer $CRON_SECRET");
    // Reject a literal placeholder that would fail auth against the cron routes.
    expect(src).not.toContain("Authorization: Bearer ***");
  });

  it("expire-plans targets /api/cron/expire-plans and authenticates with the shared CRON_SECRET bearer token", () => {
    const src = expirePlans();
    expect(src).toContain("/api/cron/expire-plans");
    expect(src).toContain("load_env_key CRON_SECRET");
    expect(src).toContain(": \"${CRON_SECRET:?CRON_SECRET not set in env}\"");
    expect(src).toContain("Authorization: Bearer $CRON_SECRET");
    // Reject a literal placeholder that would fail auth against the cron routes.
    expect(src).not.toContain("Authorization: Bearer ***");
  });

  it("both scripts load the URL from env (CUBIQLO_URL or CUBICLE_URL) and default to dev", () => {
    for (const src of [pakasirSync(), expirePlans()]) {
      expect(src).toContain("load_env_key CUBIQLO_URL");
      expect(src).toContain("load_env_key CUBICLE_URL");
      expect(src).toContain("https://dev.cubiqlo.com");
    }
    // The dev env file must actually carry CRON_SECRET + CUBICLE_URL so a
    // bare scheduled run works (matches the reconcile scheduler test).
    expect(envLocal()).toContain("CRON_SECRET=");
    expect(envLocal()).not.toMatch(/CRON_SECRET=\s*$/);
    expect(envLocal()).toContain("CUBICLE_URL=");
  });

  it("both scripts refuse production unless ALLOW_PRODUCTION_BILLING_CRON=1", () => {
    for (const src of [pakasirSync(), expirePlans()]) {
      expect(src).toContain("https://cubiqlo.com");
      expect(src).toContain("ALLOW_PRODUCTION_BILLING_CRON");
      expect(src).toContain("Refusing to run billing cron against production");
      expect(src).toContain("exit 1");
    }
  });
});
