import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/notifications", () => ({
  sendNotification: vi.fn(async () => {}),
}));

vi.mock("@/lib/actions/personal-site", () => ({
  getPublishedPersonalSiteBySlug: vi.fn(async () => ({ userId: "u-1", title: "My Site" })),
}));

vi.mock("@/db", () => {
  const userRow = [{ email: "owner@cubiqlo.test", name: "Owner" }];

  const makeChain = (data: unknown[]) => ({
    limit: vi.fn(async () => data),
    where: vi.fn(() => makeChain(data)),
    from: vi.fn(() => makeChain(data)),
  });

  const userChain = makeChain(userRow);

  return {
    db: {
      select: vi.fn(() => userChain),
    },
  };
});

import { POST } from "@/app/site/[slug]/contact/route";
import { sendNotification } from "@/lib/notifications";
import { getPublishedPersonalSiteBySlug } from "@/lib/actions/personal-site";

const mockSendNotification = vi.mocked(sendNotification);
const mockGetPublishedPersonalSiteBySlug = vi.mocked(getPublishedPersonalSiteBySlug);

describe("POST /site/[slug]/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublishedPersonalSiteBySlug.mockResolvedValue({ userId: "u-1", title: "My Site" } as never);
  });

  it("returns 404 for non-normalized slug", async () => {
    const request = new Request("http://localhost/site/test%20bad/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "V", email: "v@e.com", message: "Hi" }) });
    const response = await POST(request, { params: Promise.resolve({ slug: "test bad" }) });
    expect(response.status).toBe(404);
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new Request("http://localhost/site/test/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "A", email: "a@b.c" }) });
    const response = await POST(request, { params: Promise.resolve({ slug: "test" }) });
    expect(response.status).toBe(400);
  });

  it("honors honeypot field (bot trap)", async () => {
    const request = new Request("http://localhost/site/test/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Bot", email: "b@b.b", message: "x", _hp: "filled" }) });
    const response = await POST(request, { params: Promise.resolve({ slug: "test" }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("sends notification and returns success on valid form", async () => {
    const request = new Request("http://localhost/site/test/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Visitor", email: "v@e.com", message: "Message" }) });
    const response = await POST(request, { params: Promise.resolve({ slug: "test" }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when effective published site is missing", async () => {
    mockGetPublishedPersonalSiteBySlug.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/site/old-custom/contact", { method: "POST", headers: { "x-forwarded-for": "old-custom-404" }, body: JSON.stringify({ name: "V", email: "v@e.com", message: "Hi" }) }), { params: Promise.resolve({ slug: "old-custom" }) });
    expect(response.status).toBe(404);
  });

  it("rate limits after 3 requests per hour per IP", async () => {
    const ip = "192.168.1.100";
    for (let i = 0; i < 3; i++) {
      const req = new Request("http://localhost/site/test/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ name: "R", email: `${i}@r.r`, message: "M" }),
      });
      const res = await POST(req, { params: Promise.resolve({ slug: "test" }) });
      expect(res.status).toBe(200);
    }
    const blocked = await POST(new Request("http://localhost/site/test/contact", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ name: "F", email: "f@f.f", message: "F" }) }), { params: Promise.resolve({ slug: "test" }) });
    expect(blocked.status).toBe(429);
  });
});
