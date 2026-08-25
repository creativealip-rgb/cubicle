import { beforeEach, describe, expect, it, vi } from "vitest";
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

const request = (body: unknown) => new Request("http://localhost/api/preferences", {
  method: "POST",
  ...origin,
  body: JSON.stringify(body),
});

describe("POST /api/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertSameOrigin).mockImplementation(() => undefined);
    session.mockResolvedValue(null);
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    update.mockReturnValue({ set } as any);
  });

  it.each([
    request(null),
    new Request("http://localhost/api/preferences", { method: "POST", ...origin, body: "" }),
    request({}),
    request({ lang: "" }),
    request({ currency: "" }),
    request({ lang: "fr" }),
    request({ currency: "EUR" }),
    request({ lang: "en", currency: "EUR" }),
  ])("rejects invalid payload with 400", async (bodyRequest) => {
    const response = await POST(bodyRequest);
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
    expect(session).not.toHaveBeenCalled();
  });

  it("checks same-origin before parsing or mutation", async () => {
    vi.mocked(assertSameOrigin).mockImplementation(() => { throw new Error("Cross-origin request rejected"); });
    const response = await POST(request({ lang: "en" }));
    expect(response.status).toBe(403);
    expect(assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(session).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("sets language and currency cookies for anonymous request", async () => {
    const response = await POST(request({ lang: "en", currency: "USD" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cubiqlo_lang=en");
    expect(response.headers.get("set-cookie")).toContain("cubiqlo_currency=USD");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=31536000");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).not.toContain("Secure");
    expect(session).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it("sets currency cookie without auth or DB", async () => {
    const response = await POST(request({ currency: "IDR" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("cubiqlo_currency=IDR");
    expect(response.headers.get("set-cookie")).not.toContain("cubiqlo_lang=");
    expect(session).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("authenticates language-only request and persists authenticated language", async () => {
    session.mockResolvedValue({ user: { id: "u1" } } as any);
    const response = await POST(request({ lang: "id" }));
    expect(response.status).toBe(200);
    expect(session).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    const chain = update.mock.results[0]?.value;
    expect(chain.set).toHaveBeenCalledWith({ preferredLanguage: "id" });
    expect(chain.set.mock.results[0]?.value.where).toHaveBeenCalled();
  });

  it.each(["auth", "db"])("returns generic 500 on %s failure", async (failure) => {
    if (failure === "auth") session.mockRejectedValue(new Error("secret auth detail"));
    else {
      session.mockResolvedValue({ user: { id: "u1" } } as any);
      update.mockImplementation(() => { throw new Error("secret DB detail"); });
    }
    const response = await POST(request({ lang: "en" }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/secret (auth|DB) detail/);
  });
});

it("auth wiring exposes preferredLanguage", async () => {
  const source = await import("fs").then((fs) => fs.readFileSync("src/lib/auth.ts", "utf8"));
  expect(source).toContain("additionalFields");
  expect(source).toContain("preferredLanguage");
});

it("production source wiring enables secure cookies", async () => {
  const source = await import("fs").then((fs) => fs.readFileSync("src/app/api/preferences/route.ts", "utf8"));
  expect(source).toContain('secure: process.env.NODE_ENV === "production"');
});
