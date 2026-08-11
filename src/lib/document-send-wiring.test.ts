import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("proposal/contract/questionnaire send wiring (duplicate-send + email-result guard)", () => {
  it("sendProposal locks the row, guards the status transition, and emails the client before committing sent", () => {
    const proposals = read("src/lib/actions/proposals.ts");
    // Row lock + conditional transition so concurrent sends can't double-rotate the token
    expect(proposals).toContain('.for("update")');
    expect(proposals).toMatch(/locked\.status === "accepted"/);
    // Client email is resolved and used as recipient
    expect(proposals).toContain("Client email is missing");
    expect(proposals).toMatch(/to: recipientEmail/);
    // Email failure throws BEFORE the status update → transaction rolls back
    expect(proposals).toContain("Failed to send proposal email");
    expect(proposals).toContain("if (!emailResult.success)");
    // Activity log + auth still preserved
    expect(proposals).toContain('"sent_proposal"');
    expect(proposals).toContain("assertWorkspaceWritable");
  });

  it("sendContract locks the row, guards the status transition, and emails the client before committing sent", () => {
    const contracts = read("src/lib/actions/contracts.ts");
    expect(contracts).toContain('.for("update")');
    expect(contracts).toMatch(/locked\.status !== "draft" && locked\.status !== "sent"/);
    expect(contracts).toContain("Client email is missing");
    expect(contracts).toMatch(/to: recipientEmail/);
    expect(contracts).toContain("Failed to send contract email");
    expect(contracts).toContain("if (!emailResult.success)");
    expect(contracts).toContain('"sent_contract"');
    expect(contracts).toContain("assertWorkspaceWritable");
  });

  it("sendQuestionnaire emails the client inside a transaction and does not create an orphaned response on email failure", () => {
    const questionnaires = read("src/lib/actions/questionnaires.ts");
    expect(questionnaires).toContain("Client email is missing");
    expect(questionnaires).toMatch(/to: recipientEmail/);
    expect(questionnaires).toContain("Failed to send questionnaire email");
    expect(questionnaires).toContain("if (!emailResult.success)");
    // Response insert is inside the transaction (tx.insert), so email failure rolls it back
    expect(questionnaires).toMatch(/tx\.insert\(questionnaireResponses\)/);
    expect(questionnaires).toContain('"sent_questionnaire"');
    expect(questionnaires).toContain("assertWorkspaceWritable");
  });

  it("all three send actions use the shared Resend helper (sendNotification) with Reply-To support", () => {
    for (const file of [
      "src/lib/actions/proposals.ts",
      "src/lib/actions/contracts.ts",
      "src/lib/actions/questionnaires.ts",
    ]) {
      const src = read(file);
      expect(src).toContain('import { sendNotification } from "@/lib/notifications"');
      expect(src).toContain("resolveWorkspaceReplyTo");
    }
  });
});
