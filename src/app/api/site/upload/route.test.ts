import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/site/upload/route";
import type { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

// Mock fs for local fallback
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
}));

import { auth } from "@/lib/auth";

const mockGetSession = vi.mocked(auth.api.getSession);

function makeRequest(file?: File): NextRequest {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/site/upload", {
    method: "POST",
    body: form,
  }) as unknown as NextRequest;
}

describe("POST /api/site/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_BUCKET_NAME;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null as any);

    const response = await POST(makeRequest(new File(["x"], "a.png", { type: "image/png" })));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when file is missing", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("file required");
  });

  it("returns 400 when file exceeds 5MB", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const bigFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });

    const response = await POST(makeRequest(bigFile));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Max 5MB");
  });

  it("returns 400 for disallowed MIME types", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const badFile = new File(["<script>alert(1)</script>"], "evil.html", { type: "text/html" });

    const response = await POST(makeRequest(badFile));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("PNG");
  });

  it("accepts valid image and stores locally when R2 not configured", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = new File(["fake-image-bytes"], "photo.webp", { type: "image/webp" });

    const response = await POST(makeRequest(file));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.url).toMatch(/^\/api\/site\/image\/.*\.webp$/);
  });

  it("accepts all allowed image formats (png, jpeg, webp, gif)", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const allowed = [
      ["a.png", "image/png"],
      ["b.jpg", "image/jpeg"],
      ["c.webp", "image/webp"],
      ["d.gif", "image/gif"],
    ] as const;

    for (const [name, type] of allowed) {
      const response = await POST(makeRequest(new File(["bytes"], name, { type })));
      expect(response.status).toBe(200);
    }
  });
});
