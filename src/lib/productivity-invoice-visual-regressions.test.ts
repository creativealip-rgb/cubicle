import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("invoice and productivity visual revisions", () => {
  it("removes detail report from invoice PDF only", () => {
    const pdf = read("src/components/invoices/invoice-pdf.tsx");
    const sender = read("src/app/(app)/app/invoices/[invoiceId]/send-invoice-button.tsx");
    expect(pdf).not.toContain("Detail report — under description table");
    expect(sender).toContain("Attach detail report link");
  });

  it("keeps one goal CTA and shows habit empty state", () => {
    const page = read("src/app/(app)/app/productivity/page.tsx");
    const habits = read("src/components/productivity/habits-section.tsx");
    expect(page.match(/<GoalDialog/g)).toHaveLength(1);
    expect(habits).toContain("No Habits Created");
  });

  it("shows weekly trend without habit consistency heatmap", () => {
    const heatmap = read("src/components/productivity/habit-heatmap.tsx");
    expect(heatmap).toContain("Weekly Trend (5 Weeks)");
    expect(heatmap).not.toContain("Habit Consistency");
    expect(heatmap).not.toContain("Last 35 days");
  });
});
