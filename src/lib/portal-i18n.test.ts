import { describe, expect, it } from "vitest";
import {
  normalizePortalLang,
  portalLocale,
  portalProjectProgressLabel,
  portalRequestStatusLabel,
  portalStatusLabel,
} from "./portal-i18n";

describe("portal i18n", () => {
  it("normalizes unsupported language to English", () => {
    expect(normalizePortalLang(undefined)).toBe("en");
    expect(normalizePortalLang("fr")).toBe("en");
    expect(normalizePortalLang("en")).toBe("en");
    expect(normalizePortalLang("id")).toBe("id");
  });

  it("maps language to date locale", () => {
    expect(portalLocale("id")).toBe("id-ID");
    expect(portalLocale("en")).toBe("en-US");
  });

  it("translates common statuses", () => {
    expect(portalStatusLabel("completed", "id")).toBe("Selesai");
    expect(portalStatusLabel("completed", "en")).toBe("Completed");
    expect(portalStatusLabel("in_progress", "en")).toBe("In progress");
  });

  it("translates request statuses", () => {
    expect(portalRequestStatusLabel("pending", "id")).toBe("Menunggu");
    expect(portalRequestStatusLabel("pending", "en")).toBe("Pending");
  });

  it("translates completed active project progress", () => {
    expect(portalProjectProgressLabel("active", 2, 2, "id")).toBe(
      "Semua tugas selesai · menunggu penutupan",
    );
    expect(portalProjectProgressLabel("active", 2, 2, "en")).toBe(
      "All tasks completed · awaiting closure",
    );
  });
});
