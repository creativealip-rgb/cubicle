import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const proxy = readFileSync(resolve(process.cwd(), "src/proxy.ts"), "utf8");

describe("proxy scanner-path handling", () => {
  it("rejects common secret and PHP probe paths before routing", () => {
    expect(proxy).toContain("isSensitiveProbePath");
    expect(proxy).toContain('return new NextResponse(null, { status: 404 })');
    for (const marker of ["\\.env", "\\.git", "phpinfo\\.php"]) expect(proxy).toContain(marker);
  });

  it("does not report pass-through site responses as final HTTP status", () => {
    expect(proxy).not.toContain('pathname.startsWith("/site")');
    expect(proxy).not.toContain("logRequest(");
  });
});
