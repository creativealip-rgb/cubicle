import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("centralized cron authentication", () => {
  it("uses constant-time shared verification in every cron route", () => {
    const helper = read("src/lib/cron-auth.ts");
    expect(helper).toContain("timingSafeEqual");
    expect(helper).toContain("verifyCronRequest");
    for (const route of ["expire-plans", "invoice-overdue", "personal-note-reminders", "plan-reminders"]) {
      const source = read(`src/app/api/cron/${route}/route.ts`);
      expect(source).toContain('import { verifyCronRequest } from "@/lib/cron-auth"');
      expect(source).toContain("const unauthorized = verifyCronRequest(request)");
      expect(source).not.toContain("authHeader !==");
    }
  });
});
