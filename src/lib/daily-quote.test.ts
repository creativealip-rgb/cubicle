import { describe, expect, it } from "vitest";
import { localDateInTimezone, parseDailyQuote } from "./daily-quote";

describe("daily quote", () => {
  it("uses requested timezone and Jakarta fallback", () => {
    const now = new Date("2026-09-06T17:30:00Z");
    expect(localDateInTimezone(now, "Asia/Jakarta")).toBe("2026-09-07");
    expect(localDateInTimezone(now, "invalid/timezone")).toBe("2026-09-07");
  });

  it("accepts one plain quote and rejects unsafe output", () => {
    expect(parseDailyQuote('Keep moving. — Maya')).toEqual({ quote: "Keep moving.", attribution: "Maya" });
    for (const value of ["", "<b>Move</b>", "line one\nline two", "x".repeat(281)]) {
      expect(() => parseDailyQuote(value)).toThrow();
    }
  });
});
