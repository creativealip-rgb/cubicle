import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/(app)/app/dashboard/page.tsx", "utf8");

it("aggregates tenant-scoped pending task, proposal, and contract approvals", () => {
  expect(source).toContain("taskApprovals:");
  expect(source).toContain("proposalApprovals:");
  expect(source).toContain("contractApprovals:");
  expect(source).toContain("status IN ('sent','viewed')");
  expect(source).toContain("approvalTotal");
});

it("renders approval categories in a popover instead of linking the card directly", () => {
  expect(source).toContain("<Popover key={item.key}>");
  expect(source).toContain('href="/app/tasks?status=review"');
  expect(source).toContain('href="/app/proposals?status=sent"');
  expect(source).toContain('href="/app/contracts?status=sent"');
  expect(source).toContain('t("Tidak ada approval tertunda", "No pending approvals")');
  expect(source).toContain('t("Approval klien tertunda", "Pending client approvals")');
});
