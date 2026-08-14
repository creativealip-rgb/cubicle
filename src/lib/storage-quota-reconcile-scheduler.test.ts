import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const scheduler = () => read("scripts/cron-reconcile-storage-quota.sh");
const composeDev = () => read("docker-compose.dev.yml");
const envLocal = () => {
  try {
    return read(".env.development.local");
  } catch {
    return "";
  }
};

describe("storage quota reconcile scheduler wiring", () => {
  it("scheduler authenticates with the shared CRON_SECRET bearer token", () => {
    const src = scheduler();
    // Same auth pattern as the existing hourly reminders cron.
    expect(src).toContain('Authorization: Bearer $CRON_SECRET');
    expect(src).toContain('load_env_key CRON_SECRET');
    expect(src).toContain(": \"${CRON_SECRET:?CRON_SECRET not set in env}\"");
    expect(src).toContain(": \"${CUBICLE_URL:?CUBICLE_URL not set in env}\"");
  });

  it("scheduler targets the age-gated reconcile endpoint", () => {
    const src = scheduler();
    expect(src).toContain("/api/cron/reconcile-storage-quota");
  });

  it("scheduler is dry-run by default and requires explicit --apply", () => {
    const src = scheduler();
    expect(src).toContain('QUERY="?dryRun=1" # default: report only, never mutate');
    expect(src).toContain("--apply) APPLY=1");
    expect(src).toContain("--dry-run) APPLY=0");
    // Without --apply the URL carries ?dryRun=1, so the endpoint never zeroes.
    expect(src).toContain('URL="$BASE_URL$ENDPOINT$QUERY"');
  });

  it("scheduler refuses production apply without ALLOW_PRODUCTION_RECONCILE=1", () => {
    const src = scheduler();
    expect(src).toContain("https://cubiqlo.com");
    expect(src).toContain("ALLOW_PRODUCTION_RECONCILE");
    expect(src).toContain("Refusing to apply reconciliation against production");
  });

  it("dev compose no longer nulls CRON_SECRET (environment: overrides env_file)", () => {
    const compose = composeDev();
    // The empty pin that silently overrode .env.development.local is gone.
    expect(compose).not.toContain('CRON_SECRET: ""');
    // The env_file should still carry a real secret so the compose fix has an
    // effect. The file is gitignored and absent in this checkout, so this is
    // enforced only when the local dev env file exists.
    const local = envLocal();
    if (local) {
      expect(local).toContain("CRON_SECRET=");
      expect(local).not.toMatch(/CRON_SECRET=\s*$/);
    }
  });
});
