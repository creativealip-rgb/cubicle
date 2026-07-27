import { describe, expect, it } from "vitest";
import { assistantCopy, formatAssistantRelativeTime, getAssistantCopy, humanizeToolStatus, sanitizeAssistantError } from "./ui-copy";
import { assistantQuickActions, primaryAssistantActions } from "./quick-actions";

describe("Assistant UI registry", () => {
  it("provides complete localized copy", () => {
    expect(Object.keys(assistantCopy.id).sort()).toEqual(Object.keys(assistantCopy.en).sort());
    expect(getAssistantCopy("id").title).toBe("Asisten Kerja");
    expect(getAssistantCopy("en").title).toBe("Work Assistant");
  });

  it("humanizes known and unknown tool statuses without raw identifiers", () => {
    expect(humanizeToolStatus("Running list_invoices…", "id")).toBe("Memeriksa invoice…");
    expect(humanizeToolStatus("list_clients", "en")).toBe("Looking up client data…");
    expect(humanizeToolStatus("internal_secret_tool", "id")).toBe("Memeriksa data workspace…");
    expect(humanizeToolStatus("internal_secret_tool", "id")).not.toContain("internal_secret_tool");
  });

  it("sanitizes provider and transport errors", () => {
    expect(sanitizeAssistantError("HTTP 500: 9router upstream OpenAI body", "id")).toBe("Koneksi AI sedang bermasalah. Data kamu tidak diubah.");
    expect(sanitizeAssistantError("Stopped by user", "en")).toBe("The answer stopped before completion. Send the question again.");
  });

  it("localizes relative dates", () => {
    const now = new Date("2026-07-26T07:00:00.000Z").getTime();
    expect(formatAssistantRelativeTime("2026-07-26T06:58:00.000Z", "id", now)).toBe("2 menit lalu");
    expect(formatAssistantRelativeTime("2026-07-26T06:58:00.000Z", "en", now)).toBe("2 minutes ago");
  });

  it("has four primary actions and no demo entity defaults", () => {
    expect(primaryAssistantActions).toHaveLength(4);
    const serialized = JSON.stringify(assistantQuickActions);
    expect(serialized).not.toMatch(/Kopi Senja|INV-0001/);
    expect(new Set(assistantQuickActions.map((item) => item.category))).toEqual(new Set(["summary", "finance", "work", "clients", "sales"]));
  });
});
