import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const expenseActions = readFileSync("src/components/expenses/edit-expense-button.tsx", "utf8");
const expenseForm = readFileSync("src/components/expenses/expense-form.tsx", "utf8");
const support = readFileSync("src/app/(app)/app/support/support-client.tsx", "utf8");

describe("dialog focus and pending accessibility", () => {
  it("restores expense dialog focus to its row action trigger", () => {
    expect(expenseActions).toContain("triggerRef");
    expect(expenseActions.match(/onCloseAutoFocus={restoreTriggerFocus}/g)).toHaveLength(2);
  });

  it("restores support dialog focus to the trigger that opened it", () => {
    expect(support).toContain("createTriggerRef.current = event.currentTarget");
    expect(support).toContain("onCloseAutoFocus={restoreCreateFocus}");
  });

  it("exposes pending forms to assistive technology", () => {
    expect(expenseForm).toContain("aria-busy={loading || uploading}");
    expect(support).toContain("aria-busy={isPending}");
  });
});
