import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("distributed rate limiter wiring", () => {
  it("wraps Better Auth Node handlers instead of Edge proxy", () => {
    const route = read("src/app/api/auth/[...all]/route.ts");
    const proxy = read("src/proxy.ts");
    expect(route).toContain("enforceRateLimit");
    expect(route).toContain("Retry-After");
    expect(proxy).not.toContain("checkRateLimit");
  });

  it.each([
    ["proposal", "src/lib/actions/proposals.ts"],
    ["contract", "src/lib/actions/contracts.ts"],
    ["questionnaire", "src/lib/actions/questionnaires.ts"],
  ])("limits public %s mutations", (_name, path) => {
    expect(read(path)).toContain("enforceServerActionRateLimit");
  });

  it.each([
    ["portal resolver", "src/lib/actions/portal.ts"],
    ["portal file upload", "src/app/api/client-portal/files/upload/route.ts"],
    ["portal request upload", "src/app/api/client-portal/requests/upload/route.ts"],
    ["public invoice PDF", "src/app/api/invoices/share/[token]/pdf/route.ts"],
    ["public file download", "src/app/api/files/[fileId]/download/route.ts"],
    ["payment webhook", "src/app/api/webhooks/pakasir/route.ts"],
    ["AI chat", "src/app/api/ai/chat/route.ts"],
    ["AI action", "src/app/api/ai/action/route.ts"],
  ])("limits %s", (_name, path) => {
    expect(read(path)).toMatch(/enforce(?:ServerAction)?RateLimit/);
  });

  it("passes Redis URL into production runtime", () => {
    const compose = read("docker-compose.yml");
    expect(compose).toContain("RATE_LIMIT_REDIS_URL: ${RATE_LIMIT_REDIS_URL");
  });
});
