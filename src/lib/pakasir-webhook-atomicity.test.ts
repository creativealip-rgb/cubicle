import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "src/app/api/webhooks/pakasir/route.ts"),
  "utf8",
);

function postBody() {
  const start = source.indexOf("export async function POST");
  const end = source.indexOf("\nexport async function GET", start);
  return source.slice(start, end);
}

describe("Pakasir webhook atomicity wiring", () => {
  const body = postBody();

  it("locks payment before checking current status in transaction", () => {
    const transaction = body.slice(body.indexOf("db.transaction"));
    expect(transaction).toContain("FOR UPDATE");
    expect(transaction.indexOf("FOR UPDATE")).toBeLessThan(
      transaction.indexOf("current.status === \"completed\""),
    );
  });

  it("keeps entitlement and completion writes on transaction client", () => {
    const transaction = body.slice(body.indexOf("db.transaction"));
    expect(transaction).toMatch(/tx\s*\.update\(users\)/);
    expect(transaction).toMatch(/tx\s*\.update\(pakasirPayments\)/);
  });

  it("conditionally transitions pending payment only", () => {
    expect(body).toContain("eq(pakasirPayments.status, \"pending\")");
    expect(body).toContain("idempotent: true");
  });
});
