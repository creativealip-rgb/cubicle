import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const sync = () => read("src/lib/pakasir-sync.ts");
const webhook = () => read("src/app/api/webhooks/pakasir/route.ts");
const cronRoute = () => read("src/app/api/cron/pakasir-sync/route.ts");

describe("pakasir-sync missed-webhook recovery wiring", () => {
  it("scans only pending payments, bounded and oldest-first", () => {
    const src = sync();
    expect(src).toContain('eq(pakasirPayments.status, "pending")');
    expect(src).toContain("orderBy(pakasirPayments.createdAt)");
    expect(src).toContain(".limit(limit)");
  });

  it("re-fetches provider detail fail-closed before activating", () => {
    const src = sync();
    expect(src).toContain("getPakasirTransactionDetail({ orderId: payment.orderId, amount })");
    // The cron must never trust the local pending row alone — only a
    // provider-confirmed "completed" status may activate.
    expect(src).toContain('verifiedStatus !== "completed"');
  });

  it("delegates activation to the shared helper (single source of truth)", () => {
    const src = sync();
    expect(src).toContain("activateCompletedPakasirPayment(payment.id, {");
    expect(src).toContain("providerOrderId: current.orderId");
    expect(src).toContain("providerEventId: orderId");
  });

  it("isolates per-payment provider errors so one failure cannot block the batch", () => {
    const src = sync();
    expect(src).toContain("// Isolate: one failed payment must not block the rest of the batch.");
    expect(src).toMatch(/catch \(err\)/);
  });

  it("webhook route delegates to the shared helper and no longer inlines activation", () => {
    const src = webhook();
    expect(src).toContain("activateCompletedPakasirPayment(payment.id, {");
    // The webhook must not duplicate the row-locked activation logic.
    expect(src).not.toContain("FOR UPDATE");
    expect(src).not.toContain("tx.update(users)");
  });

  it("cron route is protected by verifyCronRequest", () => {
    const src = cronRoute();
    expect(src).toContain("verifyCronRequest(request)");
    expect(src).toContain("syncPendingPakasirPayments(limit)");
  });
});
