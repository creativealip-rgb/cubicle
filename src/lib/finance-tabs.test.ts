import { describe, expect, it } from "vitest";
import { groupEligibleTimeEntries, parseInvoiceTab, parseReportTab, parseUuidList, withQuery } from "./finance-tabs";

describe("finance IA tabs", () => {
  it("falls back safely for unknown URL tabs", () => {
    expect(parseReportTab("wat")).toBe("finance");
    expect(parseInvoiceTab("wat")).toBe("all");
    expect(parseReportTab("time")).toBe("time");
    expect(parseInvoiceTab("uninvoiced")).toBe("uninvoiced");
  });

  it("preserves useful query filters while changing tabs", () => {
    expect(withQuery("/app/reports", { period: "month", from: undefined }, { tab: "time" })).toBe("/app/reports?period=month&tab=time");
  });

  it("accepts only unique UUID deep-link ids", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(parseUuidList(`${id},bad,${id}`)).toEqual([id]);
  });

  it("groups only entries with authoritative client and project context", () => {
    const grouped = groupEligibleTimeEntries([{ id: "a", clientId: "c", projectId: "p" }, { id: "b", clientId: null, projectId: "p" }, { id: "c", clientId: "c", projectId: "p" }]);
    expect(grouped).toEqual([[{ id: "a", clientId: "c", projectId: "p" }, { id: "c", clientId: "c", projectId: "p" }]]);
  });
});
