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

const imageBytes = {
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
  webp: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
  gif: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
};

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

  it("rejects spoofed image MIME when bytes are active content", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const response = await POST(makeRequest(new File(["<script>alert(1)</script>"], "evil.png", { type: "image/png" })));
    expect(response.status).toBe(400);
  });

  it("rejects extension and MIME mismatch", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const response = await POST(makeRequest(new File([imageBytes.png], "photo.png", { type: "image/jpeg" })));
    expect(response.status).toBe(400);
  });

  it("accepts valid image and stores locally when R2 not configured", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const file = new File([imageBytes.webp], "photo.webp", { type: "image/webp" });

    const response = await POST(makeRequest(file));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.url).toMatch(/^\/api\/site\/image\/.*\.webp$/);
  });

  it("accepts all allowed image formats (png, jpeg, webp, gif)", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    const allowed = [
      ["a.png", "image/png", imageBytes.png],
      ["b.jpg", "image/jpeg", imageBytes.jpg],
      ["c.webp", "image/webp", imageBytes.webp],
      ["d.gif", "image/gif", imageBytes.gif],
    ] as const;

    for (const [name, type, bytes] of allowed) {
      const response = await POST(makeRequest(new File([bytes], name, { type })));
      expect(response.status).toBe(200);
    }
  });
});
