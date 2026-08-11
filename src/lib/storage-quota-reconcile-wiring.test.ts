import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const lib = () => read("src/lib/storage-quota-reconcile.ts");
const cli = () => read("scripts/reconcile-storage-quota.ts");
const cronRoute = () => read("src/app/api/cron/reconcile-storage-quota/route.ts");

describe("storage quota reconcile wiring", () => {
  it("lib defaults to dry run and requires an explicit opt-in to apply", () => {
    const src = lib();
    expect(src).toContain("dryRun = true");
    expect(src).toContain("dryRun: false");
    expect(src).toContain("export async function reconcileWorkspaceStorageUsage(");
  });

  it("apply mode zeroes reservations only and never touches the files table", () => {
    const src = lib();
    // Updates only workspace_storage_usage.
    expect(src).toContain(".update(workspaceStorageUsage)");
    expect(src).toContain("reservedBytes: 0, reservedFiles: 0");
    // No delete of files anywhere in the reconcile path.
    expect(src).not.toMatch(/delete\(files\)/);
    expect(src).not.toMatch(/\.delete\(/);
    // The scan reads committed files as the source of truth.
    expect(src).toContain("leftJoin(files,");
    expect(src).toContain("count(${files.id})");
  });

  it("scan selects updated_at and the age gate drives stale classification", () => {
    const src = lib();
    // The scan carries the last-touch timestamp used by the age gate.
    expect(src).toContain("updatedAt: workspaceStorageUsage.updatedAt");
    // 5-minute age gate: younger reservations are "active", older are "stale".
    expect(src).toContain("RESERVATION_STALE_AFTER_MS = 5 * 60 * 1000");
    expect(src).toContain('"active"');
  });

  it("apply mode repeats the age predicate atomically in the UPDATE WHERE clause", () => {
    const src = lib();
    // A reservation that is touched between scan and UPDATE must not be zeroed:
    // the same age predicate is part of the UPDATE itself.
    expect(src).toContain("now() - interval '5 minutes'");
    expect(src).toContain("workspaceStorageUsage.updatedAt} < now()");
    expect(src).toContain("isStaleReservation(row, now)");
    expect(src).toContain("classifyReservation(row, now)");
  });

  it("report exposes active and stale counts", () => {
    const src = lib();
    expect(src).toContain("active: number;");
    expect(src).toContain("stale: number;");
    expect(src).toContain("const { active, stale } = summarizeStorageUsageScan(rows, now)");
  });

  it("CLI is dry-run by default and gates apply on explicit flags", () => {
    const src = cli();
    expect(src).toContain('argv.includes("--apply")');
    expect(src).toContain("dryRun: !apply");
    expect(src).toContain("ALLOW_PRODUCTION_RECONCILE");
    expect(src).toContain("would reset to 0");
    expect(src).not.toMatch(/delete\(files\)|deleteStoredFile/);
  });

  it("cron route is protected by the shared CRON_SECRET guard", () => {
    const src = cronRoute();
    expect(src).toContain('import { verifyCronRequest } from "@/lib/cron-auth"');
    expect(src).toContain("const unauthorized = verifyCronRequest(request)");
    expect(src).toContain("reconcileWorkspaceStorageUsage({ dryRun })");
  });

  it("cron route applies by default and supports an explicit dryRun escape hatch", () => {
    const src = cronRoute();
    expect(src).toContain('new URL(request.url).searchParams.get("dryRun") === "1"');
    // Apply is the default: no dryRun flag means it reconciles for real.
    expect(src).toContain('const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";');
  });
});
