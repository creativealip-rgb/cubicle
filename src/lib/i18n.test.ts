import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  headers: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("next/headers", () => ({
  headers: mocks.headers,
  cookies: mocks.cookies,
}));

import { getCurrentLang } from "./i18n";

function setCookie(value?: string) {
  mocks.cookies.mockResolvedValue({
    get: vi.fn(() => (value === undefined ? undefined : { value })),
  });
}

describe("getCurrentLang", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getSession.mockResolvedValue({ user: {} });
    setCookie();
  });

  it("prefers valid account preferredLanguage", async () => {
    mocks.getSession.mockResolvedValue({ user: { preferredLanguage: "id" } });
    setCookie("en");
    await expect(getCurrentLang("en")).resolves.toBe("id");
  });

  it("uses valid cubiqlo_lang cookie when account field is absent", async () => {
    setCookie("id");
    await expect(getCurrentLang("en")).resolves.toBe("id");
  });

  it("uses supplied default when account and cookie are absent", async () => {
    await expect(getCurrentLang("id")).resolves.toBe("id");
  });

  it.each(["fr", "", null, 1])("ignores invalid account field %p", async (preferredLanguage) => {
    mocks.getSession.mockResolvedValue({ user: { preferredLanguage } });
    setCookie("en");
    await expect(getCurrentLang("id")).resolves.toBe("en");
  });

  it("falls back to cookie when auth fails", async () => {
    mocks.getSession.mockRejectedValue(new Error("auth unavailable"));
    setCookie("id");
    await expect(getCurrentLang("en")).resolves.toBe("id");
  });
});

it("falls back to default when auth and cookie are unusable", async () => {
  mocks.getSession.mockRejectedValue(new Error("auth unavailable"));
  setCookie("fr");
  await expect(getCurrentLang("id")).resolves.toBe("id");
});