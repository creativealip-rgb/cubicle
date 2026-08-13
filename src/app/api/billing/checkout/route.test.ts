import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks (repo convention: routes must never touch Postgres/Pakasir in tests) ──

const dbRows: {
  workspace_members: Array<{ workspaceId: string; role: string }>;
  users: Array<{ plan: string | null; planExpiresAt: Date | null }>;
  pakasir_payments: Array<Record<string, unknown>>;
} = {
  workspace_members: [],
  users: [],
  pakasir_payments: [],
};

type DbRows = typeof dbRows;
const DB_ROW_KEYS = new Set(Object.keys(dbRows));

const TABLE_NAME = Symbol.for("drizzle:Name");
const tableNameOf = (table: any): string | undefined => table?.[TABLE_NAME] as string | undefined;

vi.mock("@/db", () => {
  function makeChain(rows: any[]) {
    const chain: any = {
      where: vi.fn(() => chain),
      limit: vi.fn(async () => rows),
    };
    return chain;
  }

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: any) => {
          const name = tableNameOf(table);
          if (name && DB_ROW_KEYS.has(name)) return makeChain(dbRows[name as keyof DbRows]);
          throw new Error(`unexpected select().from on table: ${String(name)}`);
        }),
      })),
      insert: vi.fn((table: any) => {
        const name = tableNameOf(table);
        if (name === "pakasir_payments") {
          return {
            values: vi.fn((values: any) => {
              dbRows.pakasir_payments.push(values);
              return { returning: vi.fn(async () => [values]) };
            }),
          };
        }
        throw new Error(`unexpected insert on table: ${String(name)}`);
      }),
    },
    __resetTables: () => {
      for (const rows of Object.values(dbRows)) rows.length = 0;
    },
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/pakasir", () => ({
  createPakasirTransaction: vi.fn(async () => ({
    project: "cubiqlo",
    order_id: "CUB-ORDER",
    amount: 1000,
    payment_method: "qris",
    payment_number: "1234",
  })),
  isPakasirConfigured: vi.fn(() => true),
  pakasirPaymentUrl: vi.fn(() => "https://app.pakasir.com/pay/cubiqlo/1000?order_id=CUB-ORDER&qris_only=1"),
}));

vi.mock("@/lib/storage-addons", () => ({
  canPurchaseStorageAddon: vi.fn(async () => ({ allowed: true })),
}));

import { POST } from "@/app/api/billing/checkout/route";
import { auth } from "@/lib/auth";
import { createPakasirTransaction } from "@/lib/pakasir";
import { canPurchaseStorageAddon } from "@/lib/storage-addons";
import { __resetTables } from "@/db";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockCreateTransaction = vi.mocked(createPakasirTransaction);
const mockCanPurchaseStorageAddon = vi.mocked(canPurchaseStorageAddon);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://cubiqlo.com", Host: "cubiqlo.com" },
    body: JSON.stringify(body),
  });
}

const USER_ID = "user-1";
const WS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("POST /api/billing/checkout — request shape and branch ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTables();
    mockCanPurchaseStorageAddon.mockResolvedValue({ allowed: true });
    mockGetSession.mockResolvedValue({ user: { id: USER_ID } } as any);
    process.env.NEXT_PUBLIC_APP_URL = "https://cubiqlo.com";
  });

  it("reaches the storage add-on branch with { addon, period } and no plan", async () => {
    dbRows.workspace_members.push({ workspaceId: WS_A, role: "owner" });
    // Add-on rows persist the buyer's current plan label (NOT NULL solo|team);
    // the body carries no `plan` field for add-on checkouts.
    dbRows.users.push({ plan: "solo", planExpiresAt: null });

    const response = await POST(makeRequest({ addon: 5, period: "monthly" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.addon).toBe(5);
    expect(data.data.amount).toBe(10_000);
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    const inserted = dbRows.pakasir_payments[0] as any;
    expect(inserted.paymentType).toBe("storage_addon");
    expect(inserted.entitlementRef).toBe("5");
    expect(inserted.workspaceId).toBe(WS_A);
    expect(inserted.plan).toBe("solo"); // persisted plan label on add-on rows
  });

  it("reaches the plan branch with { plan, period } and no addon", async () => {
    dbRows.users.push({ plan: "free", planExpiresAt: null });
    dbRows.workspace_members.push({ workspaceId: WS_A, role: "owner" });

    const response = await POST(makeRequest({ plan: "solo", period: "monthly" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.plan).toBe("solo");
    expect(data.data.amount).toBe(75_000);
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    const inserted = dbRows.pakasir_payments[0] as any;
    expect(inserted.paymentType).toBe("plan");
    expect(inserted.workspaceId).toBe(WS_A);
  });

  it("rejects an invalid addon with 400 before any provider call", async () => {
    const response = await POST(makeRequest({ addon: 99, period: "monthly" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("add-on");
    expect(mockCreateTransaction).not.toHaveBeenCalled();
    expect(dbRows.pakasir_payments).toHaveLength(0);
  });

  it("rejects an invalid period with 400 before any provider call", async () => {
    const response = await POST(makeRequest({ addon: 5, period: "weekly" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Periode");
    expect(mockCreateTransaction).not.toHaveBeenCalled();
    expect(dbRows.pakasir_payments).toHaveLength(0);
  });

  it("rejects a non-owner with 403 before any provider call and DB insert", async () => {
    dbRows.workspace_members.push({ workspaceId: WS_A, role: "member" });

    const response = await POST(makeRequest({ addon: 5, period: "monthly" }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("pemilik");
    expect(mockCreateTransaction).not.toHaveBeenCalled();
    expect(dbRows.pakasir_payments).toHaveLength(0);
  });
});
