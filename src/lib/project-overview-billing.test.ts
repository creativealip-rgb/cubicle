import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProjectOverviewBilling } from "@/lib/project-overview-billing";

const overviewSource = readFileSync("src/components/projects/project-overview.tsx", "utf8");

describe("project overview billing", () => {
  it("uses live approved retainer minutes when no period row exists", () => {
    expect(getProjectOverviewBilling({ model: "retainer", includedMinutes: 20, usedMinutes: 1200, billableAmount: 4_000_000, invoicedAmount: 0 })).toMatchObject({ progressLead: "20h / 20m", percent: 100 });
  });

  it("uses total hourly billable work, not one-hour rate, as invoice target", () => {
    expect(getProjectOverviewBilling({ model: "hourly", includedMinutes: 0, usedMinutes: 0, billableAmount: 600_000, invoicedAmount: 200_000 })).toMatchObject({ configuredAmount: 600_000, percent: 33 });
    expect(overviewSource).toContain("configuredAmount || isRetainer || isHourly ? progressLead");
    expect(overviewSource).toContain("billingSettingAmount");
  });
});
