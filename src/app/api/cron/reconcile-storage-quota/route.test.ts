import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/reconcile-storage-quota/route";
import { reconcileWorkspaceStorageUsage } from "@/lib/storage-quota-reconcile";
import { verifyCronRequest } from "@/lib/cron-auth";

vi.mock("@/lib/storage-quota-reconcile");
vi.mock("@/lib/cron-auth");

const mockReconcile = vi.mocked(reconcileWorkspaceStorageUsage);
const mockVerifyCronRequest = vi.mocked(verifyCronRequest);

const baseReport = {
  dryRun: false,
  scanned: 2,
  stale: 1,
  applied: 1,
  rows: [
    {
      workspaceId: "ws-1",
      reservedBytes: 0,
      reservedFiles: 0,
      actualBytes: 1024,
      actualFiles: 1,
      status: "clean",
    },
    {
      workspaceId: "ws-2",
      reservedBytes: 512,
      reservedFiles: 1,
      actualBytes: 2048,
      actualFiles: 2,
      status: "stale",
    },
  ] as const,
};

describe("GET /api/cron/reconcile-storage-quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReconcile.mockResolvedValue(baseReport as any);
  });

  it("rejects requests without a valid cron secret", async () => {
    mockVerifyCronRequest.mockReturnValue(new Response("Unauthorized", { status: 401 }) as any);

    const response = await GET(new Request("http://localhost/api/cron/reconcile-storage-quota") as any);

    expect(response.status).toBe(401);
    expect(mockVerifyCronRequest).toHaveBeenCalledTimes(1);
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it("applies by default (explicit scheduled job) and reports the result", async () => {
    mockVerifyCronRequest.mockReturnValue(null);

    const response = await GET(new Request("http://localhost/api/cron/reconcile-storage-quota") as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockReconcile).toHaveBeenCalledWith({ dryRun: false });
    expect(data.ok).toBe(true);
    expect(data.dryRun).toBe(false);
    expect(data.scanned).toBe(2);
    expect(data.stale).toBe(1);
    expect(data.applied).toBe(1);
  });

  it("honors ?dryRun=1 and never mutates", async () => {
    mockVerifyCronRequest.mockReturnValue(null);
    mockReconcile.mockResolvedValue({ ...baseReport, dryRun: true, applied: 0 } as any);

    const response = await GET(
      new Request("http://localhost/api/cron/reconcile-storage-quota?dryRun=1") as any,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockReconcile).toHaveBeenCalledWith({ dryRun: true });
    expect(data.dryRun).toBe(true);
    expect(data.applied).toBe(0);
  });

  it("returns 500 when reconciliation fails", async () => {
    mockVerifyCronRequest.mockReturnValue(null);
    mockReconcile.mockRejectedValue(new Error("Database connection failed"));

    const response = await GET(new Request("http://localhost/api/cron/reconcile-storage-quota") as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
