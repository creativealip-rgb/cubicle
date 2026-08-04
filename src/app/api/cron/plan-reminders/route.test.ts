import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/plan-reminders/route";
import { getExpiringUsers } from "@/lib/subscription";
import { verifyCronRequest } from "@/lib/cron-auth";

// Mock dependencies properly
vi.mock("@/lib/subscription");
vi.mock("@/lib/cron-auth");

const mockGetExpiringUsers = vi.mocked(getExpiringUsers);
const mockVerifyCronRequest = vi.mocked(verifyCronRequest);

describe("POST /api/cron/plan-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unauthorized when cron authentication fails", async () => {
    mockVerifyCronRequest.mockReturnValue(new Response("Unauthorized", { status: 401 }) as any);

    const request = new Request("http://localhost/api/cron/plan-reminders");
    const response = await GET(request as any);
    
    expect(response.status).toBe(401);
    expect(mockVerifyCronRequest).toHaveBeenCalledTimes(1);
  });

  it("should return success when authenticated and users found", async () => {
    mockVerifyCronRequest.mockReturnValue(null);
    
    const mockUsers = [
      { id: "user-1", name: "Test User", plan: "free", daysUntilExpiry: 3 },
      { id: "user-2", name: "Another User", plan: "pro", daysUntilExpiry: 7 },
    ];
    
    mockGetExpiringUsers.mockResolvedValue(mockUsers);
    
    const request = new Request("http://localhost/api/cron/plan-reminders");
    const response = await GET(request as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.reminders).toBe(2);
    expect(data.users).toHaveLength(2);
  });

  it("should handle errors gracefully and return 500", async () => {
    mockVerifyCronRequest.mockReturnValue(null);
    mockGetExpiringUsers.mockRejectedValue(new Error("Database connection failed"));
    
    const request = new Request("http://localhost/api/cron/plan-reminders");
    const response = await GET(request as any);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
