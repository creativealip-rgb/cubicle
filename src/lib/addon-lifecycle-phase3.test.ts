import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const storage = () => read("src/lib/storage-addons.ts");
const extraWs = () => read("src/lib/extra-workspace.ts");
const schema = () => read("src/db/schema.ts");
const expireCron = () => read("src/app/api/cron/expire-plans/route.ts");

describe("Phase 3: no free renewal without payment (QRIS has no mandate)", () => {
  it("activations never set autoRenew true for new entitlements", () => {
    for (const src of [storage(), extraWs()]) {
      // New entitlements are funded by a single payment; QRIS cannot be
      // auto-charged, so a fresh entitlement must NOT be marked auto-renew.
      expect(src).not.toContain("autoRenew: true");
    }
  });

  it("new entitlements explicitly default autoRenew to false", () => {
    for (const src of [storage(), extraWs()]) {
      expect(src).toContain("autoRenew: false");
    }
  });

  it("schema default for auto_renew is false on BOTH entitlement tables (no unfunded renewal)", () => {
    const src = schema();
    // Both entitlement tables must stop defaulting new rows to auto-renew.
    const matches = src.match(/autoRenew: boolean\("auto_renew"\)\.notNull\(\)\.default\(false\)/g);
    expect(matches?.length).toBe(2);
  });
});

describe("Phase 3: expiry is terminal — the sweep never creates a new period", () => {
  it("sweep return shape no longer reports renewed rows", () => {
    for (const src of [storage(), extraWs()]) {
      expect(src).not.toMatch(/renewed: number/);
    }
  });

  it("sweep transitions ended active rows to expired and cancel_scheduled rows to cancelled", () => {
    for (const src of [storage(), extraWs()]) {
      const sweep = src.slice(src.indexOf("export async function sweep"));
      // The sweep maps cancel_scheduled → cancelled and every other due row
      // → expired via a single status update (no insert of a fresh period).
      expect(sweep).toContain('"expired"');
      expect(sweep).toContain('"cancelled"');
      expect(sweep).toMatch(/status === "cancel_scheduled" \? "cancelled" : "expired"/);
      // The old auto-renew branch (insert of a fresh active period) is gone.
      expect(sweep).not.toMatch(/Auto-renew:/);
    }
  });

  it("cancellation keeps the entitlement active until period end (cancel_scheduled still counts)", () => {
    for (const src of [storage(), extraWs()]) {
      expect(src).toContain('status: "cancel_scheduled"');
      expect(src).toMatch(/IN \('active', 'cancel_scheduled'\)/);
    }
  });
});

describe("Phase 3: sweeps are concurrency-safe (one terminal transition)", () => {
  it("sweep selects due rows with FOR UPDATE SKIP LOCKED so parallel runs serialize", () => {
    for (const src of [storage(), extraWs()]) {
      const sweep = src.slice(src.indexOf("export async function sweep"));
      // drizzle 0.45 `.for("update", { skipLocked: true })` compiles to
      // `FOR UPDATE SKIP LOCKED`; parallel sweep runs pick disjoint rows.
      expect(sweep).toMatch(/\.for\("update", \{ skipLocked: true \}\)/);
    }
  });

  it("sweep uses a conditional UPDATE guarded by due status/ends_at so only the winning run counts a transition", () => {
    for (const src of [storage(), extraWs()]) {
      const sweep = src.slice(src.indexOf("export async function sweep"));
      expect(sweep).toMatch(/IN \('active', 'cancel_scheduled'\)/);
      expect(sweep).toMatch(/endsAt} <=/);
      // Count only rows the conditional update actually changed.
      expect(sweep).toMatch(/returning\(\{ id:/);
    }
  });

  it("sweep never inserts entitlement rows", () => {
    for (const src of [storage(), extraWs()]) {
      // Scoped to the sweep body only: activation helpers legitimately insert
      // NEW entitlements after a single payment (QRIS pays per entitlement),
      // so a whole-file `.insert(` ban would over-specify the invariant. The
      // sweep itself must never create a replacement period.
      const sweep = src.slice(src.indexOf("export async function sweep"));
      expect(sweep).not.toMatch(/\.insert\(/);
    }
  });
});

describe("Phase 3: expiry cron sweeps the terminal lifecycle", () => {
  it("expire cron still invokes both sweeps", () => {
    const src = expireCron();
    expect(src).toContain("sweepStorageAddons()");
    expect(src).toContain("sweepExtraWorkspaceEntitlementsTx(tx)");
  });
});

describe("Phase 3: payment status enum gains expired (schema)", () => {
  it("payment status enum includes expired so unfunded pending rows can be closed out", () => {
    const src = schema();
    expect(src).toContain('"expired"');
  });
});

// Self-check: this file must remain source-wiring-only; no live DB calls.
