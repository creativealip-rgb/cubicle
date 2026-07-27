import { describe, expect, it } from "vitest";
import { buildReportPeriod, buildTimeGroups } from "./report-period";

const NOW = new Date("2026-07-25T12:00:00Z");

describe("buildReportPeriod", () => {
  it("defaults to current month", () => {
    expect(buildReportPeriod({}, NOW)).toMatchObject({
      preset: "month",
      start: "2026-07-01",
      end: "2026-07-31",
      comparisonStart: "2026-06-01",
      comparisonEnd: "2026-06-30",
    });
  });

  it("supports previous month", () => {
    expect(buildReportPeriod({ period: "previous-month" }, NOW)).toMatchObject({
      start: "2026-06-01",
      end: "2026-06-30",
      comparisonStart: "2026-05-01",
      comparisonEnd: "2026-05-31",
    });
  });

  it("supports current quarter", () => {
    expect(buildReportPeriod({ period: "quarter" }, NOW)).toMatchObject({
      start: "2026-07-01",
      end: "2026-09-30",
      comparisonStart: "2026-04-01",
      comparisonEnd: "2026-06-30",
    });
  });

  it("supports current year", () => {
    expect(buildReportPeriod({ period: "year" }, NOW)).toMatchObject({
      start: "2026-01-01",
      end: "2026-12-31",
      comparisonStart: "2025-01-01",
      comparisonEnd: "2025-12-31",
    });
  });

  it("accepts a valid custom range and builds equivalent comparison", () => {
    expect(
      buildReportPeriod(
        { period: "custom", from: "2026-07-10", to: "2026-07-20" },
        NOW,
      ),
    ).toMatchObject({
      preset: "custom",
      start: "2026-07-10",
      end: "2026-07-20",
      comparisonStart: "2026-06-29",
      comparisonEnd: "2026-07-09",
    });
  });

  it("normalizes an invalid custom range to current month", () => {
    expect(
      buildReportPeriod(
        { period: "custom", from: "bad", to: "2026-07-01" },
        NOW,
      ).preset,
    ).toBe("month");
  });
});

describe("buildTimeGroups", () => {
  it("groups a month into calendar-week ranges without gaps", () => {
    const groups = buildTimeGroups("2026-07-01", "2026-07-31", "month", "id");
    expect(groups.map((group) => [group.start, group.end])).toEqual([
      ["2026-07-01", "2026-07-05"],
      ["2026-07-06", "2026-07-12"],
      ["2026-07-13", "2026-07-19"],
      ["2026-07-20", "2026-07-26"],
      ["2026-07-27", "2026-07-31"],
    ]);
  });

  it("groups a year by month", () => {
    expect(
      buildTimeGroups("2026-01-01", "2026-12-31", "year", "id"),
    ).toHaveLength(12);
  });
});
