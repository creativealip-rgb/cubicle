import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webhookSource = readFileSync(
  join(process.cwd(), "src/app/api/webhooks/pakasir/route.ts"),
  "utf8",
);
const syncSource = readFileSync(
  join(process.cwd(), "src/lib/pakasir-sync.ts"),
  "utf8",
);

function postBody() {
  const start = webhookSource.indexOf("export async function POST");
  const end = webhookSource.indexOf("\nexport async function GET", start);
  return webhookSource.slice(start, end);
}

// The row-locked activation transaction now lives in the shared
// src/lib/pakasir-sync.ts helper used by both the webhook and the
// missed-webhook recovery cron, so the atomicity assertions target that file.
function activationTx() {
  const start = syncSource.indexOf("activateCompletedPakasirPayment");
  return syncSource.slice(start);
}

describe("Pakasir webhook atomicity wiring", () => {
  const body = postBody();

  it("delegates activation to the shared helper", () => {
    expect(body).toContain("activateCompletedPakasirPayment(payment.id, {");
    // The webhook must not re-implement the row-locked transaction.
    expect(body).not.toContain("FOR UPDATE");
    expect(body).not.toContain("tx.update(users)");
  });

  it("locks payment before checking current status in transaction", () => {
    const transaction = activationTx().slice(activationTx().indexOf("db.transaction"));
    expect(transaction).toContain("FOR UPDATE");
    expect(transaction.indexOf("FOR UPDATE")).toBeLessThan(
      transaction.indexOf("current.status === \"completed\""),
    );
  });

  it("keeps entitlement and completion writes on transaction client", () => {
    const transaction = activationTx().slice(activationTx().indexOf("db.transaction"));
    expect(transaction).toMatch(/tx\s*\.update\(users\)/);
    expect(transaction).toMatch(/tx\s*\.update\(pakasirPayments\)/);
  });

  it("conditionally transitions pending payment only", () => {
    const tx = activationTx().slice(activationTx().indexOf("db.transaction"));
    expect(tx).toContain("eq(pakasirPayments.status, \"pending\")");
    // Idempotency response handling lives in the webhook route.
    expect(body).toContain("idempotent: true");
  });
});
