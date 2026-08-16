import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("admin control plane wiring", () => {
  it("migration 0079 adds role/banned columns + audit table", () => {
    const migration = read("drizzle/0079_admin_dashboard.sql");
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "role"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "banned"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "banned_reason"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "admin_audit_logs"');
    expect(migration).toContain("gen_random_uuid()");
    expect(migration).toContain("REFERENCES \"users\"(\"id\")");
  });

  it("schema mirrors the migration (role/banned columns + adminAuditLogs table)", () => {
    const schema = read("src/db/schema.ts");
    expect(schema).toContain('role: text("role", { enum: ["user", "admin"] })');
    expect(schema).toContain('banned: boolean("banned")');
    expect(schema).toContain("bannedReason");
    expect(schema).toContain("adminAuditLogs = pgTable");
    expect(schema).toContain('"admin_audit_logs"');
  });

  it("requireAdmin guards every admin action and rejects non-admins", () => {
    const admin = read("src/lib/admin.ts");
    expect(admin).toContain("ForbiddenError");
    expect(admin).toContain("users.role");
    expect(admin).toContain('throw new ForbiddenError("Admin access denied")');
  });

  it("silent provisioning does not use auth.api.signUpEmail and hashes via @better-auth/utils/password", () => {
    const users = read("src/lib/actions/admin/users.ts");
    const start = users.indexOf("export async function createUser(");
    expect(start).toBeGreaterThanOrEqual(0);
    const body = users.slice(start, users.indexOf("\nexport async function ", start + 1));
    // No signUpEmail call anywhere in the create path (comment-only mentions allowed).
    expect(body.match(/auth\.api\.signUpEmail\(/)).toBeNull();
    expect(body).toContain("hashPassword");
    expect(body).toContain("emailVerified");
    expect(body).toContain('providerId: "credential"');
    // import convention
    expect(users).toContain('from "@better-auth/utils/password"');
  });

  it("changeUserPlan writes directly and records old→new + reason audit", () => {
    const users = read("src/lib/actions/admin/users.ts");
    const start = users.indexOf("export async function changeUserPlan(");
    expect(start).toBeGreaterThanOrEqual(0);
    const body = users.slice(start, users.indexOf("\nexport async function ", start + 1));
    expect(body).toContain('"user.plan_change"');
    expect(body).toContain("reason: parsed.reason");
    expect(body).toContain("planExpiresAt: expiresAt");
    // No pakasir_payments mutation anywhere in the plan path.
    expect(body).not.toContain("pakasirPayments");
  });

  it("ban revokes sessions and blocks login via session-create hook", () => {
    const users = read("src/lib/actions/admin/users.ts");
    expect(users).toContain("tx.delete(sessions)");
    const auth = read("src/lib/auth.ts");
    expect(auth).toContain("databaseHooks");
    expect(auth).toContain("APIError");
    expect(auth).toContain("users.banned");
  });

  it("trustedOrigins includes the admin subdomain", () => {
    const auth = read("src/lib/auth.ts");
    expect(auth).toContain('"https://admin.cubiqlo.com"');
    expect(auth).toContain('"http://admin.cubiqlo.com"');
  });

  it("proxy rewrites admin host transparently and redirects stray /admin on app hosts", () => {
    const proxy = read("src/proxy.ts");
    expect(proxy).toContain("getAdminRewritePath");
    expect(proxy).toContain("NextResponse.rewrite");
    const routing = read("src/lib/host-routing.ts");
    expect(routing).toContain("ADMIN_HOST");
    expect(routing).toContain('"/admin/dashboard"');
  });

  it("admin routes exist for dashboard/users/workspaces/payments/audit", () => {
    for (const path of [
      "src/app/(admin)/admin/layout.tsx",
      "src/app/(admin)/admin/page.tsx",
      "src/app/(admin)/admin/dashboard/page.tsx",
      "src/app/(admin)/admin/users/page.tsx",
      "src/app/(admin)/admin/users/[userId]/page.tsx",
      "src/app/(admin)/admin/workspaces/page.tsx",
      "src/app/(admin)/admin/payments/page.tsx",
      "src/app/(admin)/admin/audit/page.tsx",
    ]) {
      expect(read(path).length).toBeGreaterThan(50);
    }
  });

  it("admin UI components exist and call the guarded actions", () => {
    const actions = read("src/components/admin/user-actions.tsx");
    expect(actions).toContain("banUser");
    expect(actions).toContain("changeUserPlan");
    expect(actions).toContain("resetUserPassword");
    const shell = read("src/components/admin/admin-shell.tsx");
    expect(shell).toContain("Cubiqlo Admin");
  });

  it("layout requires admin before rendering", () => {
    const layout = read("src/app/(admin)/admin/layout.tsx");
    expect(layout).toContain("requireAdmin");
    expect(layout).toContain("redirect");
  });
});
