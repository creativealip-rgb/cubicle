import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/pakasir-sync/route";
import { syncPendingPakasirPayments } from "@/lib/pakasir-sync";
import { verifyCronRequest } from "@/lib/cron-auth";

// Mock dependencies properly
vi.mock("@/lib/pakasir-sync");
vi.mock("@/lib/cron-auth");

const mockSyncPending = vi.mocked(syncPendingPakasirPayments);
const mockVerifyCronRequest = vi.mocked(verifyCronRequest);

describe("GET /api/cron/pakasir-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unauthorized when cron authentication fails", async () => {
    mockVerifyCronRequest.mockReturnValue(new Response("Unauthorized", { status: 401 }) as any);

    const request = new Request("http://localhost/api/cron/pakasir-sync");
    const response = await GET(request as any);

    expect(response.status).toBe(401);
    expect(mockVerifyCronRequest).toHaveBeenCalledTimes(1);
    expect(mockSyncPending).not.toHaveBeenCalled();
  });

  it("should sync pending payments and report counts when authenticated", async () => {
    mockVerifyCronRequest.mockReturnValue(null);
    mockSyncPending.mockResolvedValue({
      scanned: 2,
      activated: 1,
      idempotent: 0,
      ignored: 1,
      errored: 0,
      processed: [
        { orderId: "CUB-ABC-SOLO-1-ABCDEF", outcome: "activated", plan: "solo" },
        { orderId: "CUB-ABC-TEAM-2-123456", outcome: "ignored", status: "expired" },
      ],
    });

    const request = new Request("http://localhost/api/cron/pakasir-sync");
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.scanned).toBe(2);
    expect(data.activated).toBe(1);
    expect(data.ignored).toBe(1);
    expect(mockSyncPending).toHaveBeenCalledTimes(1);
  });

  it("should pass through a bounded ?limit= parameter", async () => {
    mockVerifyCronRequest.mockReturnValue(null);
    mockSyncPending.mockResolvedValue({
      scanned: 0,
      activated: 0,
      idempotent: 0,
      ignored: 0,
      errored: 0,
      processed: [],
    });

    const request = new Request("http://localhost/api/cron/pakasir-sync?limit=7");
    await GET(request as any);

    expect(mockSyncPending).toHaveBeenCalledWith(7);
  });

  it("should handle errors gracefully and return 500", async () => {
    mockVerifyCronRequest.mockReturnValue(null);
    mockSyncPending.mockRejectedValue(new Error("Database connection failed"));

    const request = new Request("http://localhost/api/cron/pakasir-sync");
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
