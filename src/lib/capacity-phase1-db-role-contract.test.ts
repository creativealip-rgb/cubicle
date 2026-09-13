import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("capacity phase 1 database role contract", () => {
  it("keeps application startup free from schema mutation", () => {
    const source = read("entrypoint.sh");
    expect(source).not.toContain("Running database migrations");
    expect(source).not.toContain("process.env.DATABASE_URL");
    expect(source).toContain("exec node server.js");
  });

  it("uses a dedicated migration URL and owner role", () => {
    const drizzle = read("drizzle.config.ts");
    const runner = read("scripts/migrate-ledger.sh");
    expect(drizzle).toContain("MIGRATION_DATABASE_URL");
    expect(drizzle).not.toContain("process.env.DATABASE_URL");
    expect(runner).toContain("MIGRATION_DATABASE_URL");
    expect(runner).toContain("current_user");
    expect(runner).toContain("MIGRATION_OWNER=cubiqlo_owner");
    expect(runner).toContain('SET ROLE $MIGRATION_OWNER');
    expect(runner).toContain('--env-file "$PG_ENV_FILE"');
    expect(runner).not.toContain('docker exec -e MIGRATION_DATABASE_URL');
    expect(runner).toContain("current_role");
    expect(runner).not.toContain("DB_USER=${DB_USER:-postgres}");
    expect(runner).toContain("ALLOW_PRODUCTION_MIGRATION");
    expect(runner).toContain("Refusing production migration");
  });

  it("provides idempotent role bootstrap and ownership audit", () => {
    const bootstrap = read("scripts/operations/bootstrap-db-roles.sql");
    const audit = read("scripts/operations/audit-db-role-ownership.sql");
    expect(bootstrap).toContain("cubiqlo_owner");
    expect(bootstrap).toContain("cubiqlo_migrator");
    expect(bootstrap).toContain("cubiqlo_app");
    expect(bootstrap).toContain("cubiqlo_backup");
    expect(bootstrap).toContain("ALTER DEFAULT PRIVILEGES");
    expect(audit).toContain("unexpected_owner_count");
  });

  it("exposes one canonical migration command", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["db:migrate"]).toBe("./scripts/migrate-ledger.sh");
    expect(pkg.scripts["db:push"]).toBeUndefined();
  });
});
