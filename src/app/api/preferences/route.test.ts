import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/preferences/route";
import { assertSameOrigin } from "@/lib/same-origin";
import { auth } from "@/lib/auth";
import { db } from "@/db";

vi.mock("@/lib/same-origin", () => ({ assertSameOrigin: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/db", () => ({ db: { update: vi.fn() } }));
vi.mock("@/db/schema", () => ({ users: { id: "id", preferredLanguage: "preferredLanguage" } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => "eq") }));

const origin = { headers: { origin: "http://localhost:3000" } };
const session = vi.mocked(auth.api.getSession);
const update = vi.mocked(db.update);

describe("POST /api/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertSameOrigin).mockImplementation(() => undefined);
    session.mockResolvedValue(null);
    update.mockReturnValue({ set: vi.fn(() => ({ where: vi.fn() })) } as any);
  });

  it.each([new Request("http://localhost/api/preferences", { method: "POST", ...origin, body: "" }), new Request("http://localhost/api/preferences", { method: "POST", ...origin, body: "{}" })])("rejects invalid payload with 400", async (request) => {
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects cross-origin before mutation", async () => {
    vi.mocked(assertSameOrigin).mockImplementation(() => { throw new Error("Cross-origin request rejected"); });
    const response = await POST(new Request("http://localhost/api/preferences", { method: "POST", body: JSON.stringify({ lang: "en" }) }));
    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates language for authenticated user, not currency", async () => {
    session.mockResolvedValue({ user: { id: "u1" } } as any);
    const response = await POST(new Request("http://localhost/api/preferences", { method: "POST", ...origin, body: JSON.stringify({ lang: "en", currency: "USD" }) }));
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.results[0]?.value.set).toHaveBeenCalledWith({ preferredLanguage: "en" });
  });

  it("returns 500 without leaking DB error", async () => {
    session.mockRejectedValue(new Error("secret DB detail"));
    const response = await POST(new Request("http://localhost/api/preferences", { method: "POST", ...origin, body: JSON.stringify({ lang: "en" }) }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret DB detail");
  });
});

it("auth wiring exposes preferredLanguage", async () => {
  const source = await import("fs").then((fs) => fs.readFileSync("src/lib/auth.ts", "utf8"));
  expect(source).toContain("additionalFields");
  expect(source).toContain("preferredLanguage");
});
