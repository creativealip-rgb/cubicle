import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("document-send UI wiring (preview + confirm, recipient/subject, pending disable)", () => {
  it("send-proposal-button renders a confirm dialog with recipient + subject and disables while pending", () => {
    const src = read("src/components/proposals/send-proposal-button.tsx");
    // Preview → confirm: the send action only fires from the dialog confirm button
    expect(src).toContain("Dialog");
    expect(src).toContain("onClick={() => setOpen(true)}");
    expect(src).toContain("handleSend");
    // Recipient + subject are displayed in the confirm step
    expect(src).toContain("Penerima");
    expect(src).toContain("Recipient");
    expect(src).toContain("Subjek");
    expect(src).toContain("Subject");
    // Subject is built from the document title
    expect(src).toContain("Proposal:");
    // Sending disabled while pending (no double-click), dialog stays open
    expect(src).toContain("disabled={pending}");
    expect(src).toMatch(/if \(!pending\) setOpen\(next\)/);
    // Bilingual labels
    expect(src).toContain('t("Batal", "Cancel")');
    expect(src).toContain('t("Kirim ulang proposal", "Resend proposal")');
    // No review status added anywhere (preview copy is fine; a status is not)
    expect(src).not.toMatch(/under_review|in_review|status: "review"/);
  });

  it("send-contract-button renders a confirm dialog with recipient + subject and disables while pending", () => {
    const src = read("src/components/contracts/send-contract-button.tsx");
    expect(src).toContain("Dialog");
    expect(src).toContain("onClick={() => setOpen(true)}");
    expect(src).toContain("handleSend");
    expect(src).toContain("Penerima");
    expect(src).toContain("Recipient");
    expect(src).toContain("Subjek");
    expect(src).toContain("Subject");
    expect(src).toContain("Contract for signature:");
    expect(src).toContain("disabled={pending}");
    expect(src).toMatch(/if \(!pending\) setOpen\(next\)/);
    expect(src).toContain('t("Batal", "Cancel")');
    expect(src).toContain('t("Kirim ulang kontrak", "Resend contract")');
    expect(src).not.toMatch(/under_review|in_review|status: "review"/);
  });

  it("send-questionnaire-button shows recipient + subject after picking a client and disables while pending", () => {
    const src = read("src/components/questionnaires/send-questionnaire-button.tsx");
    expect(src).toContain("Dialog");
    expect(src).toContain("handleSend");
    expect(src).toContain("Penerima");
    expect(src).toContain("Recipient");
    expect(src).toContain("Subjek");
    expect(src).toContain("Subject");
    expect(src).toContain("Questionnaire:");
    // Client email is available for the recipient display
    expect(src).toContain("email?: string | null");
    expect(src).toContain("disabled={pending || !clientId}");
    expect(src).toMatch(/if \(!pending\) setOpen\(next\)/);
    expect(src).toContain('t("Batal", "Cancel")');
    expect(src).not.toMatch(/under_review|in_review|status: "review"/);
  });

  it("detail pages and list tables pass title + client name/email to the send buttons", () => {
    const proposalPage = read("src/app/(app)/app/proposals/[proposalId]/page.tsx");
    expect(proposalPage).toMatch(/title=\{p\.title\}/);
    expect(proposalPage).toMatch(/clientName=\{p\.clientName\}/);
    expect(proposalPage).toMatch(/clientEmail=\{p\.clientEmail\}/);

    const contractPage = read("src/app/(app)/app/contracts/[contractId]/page.tsx");
    expect(contractPage).toMatch(/title=\{c\.title\}/);
    expect(contractPage).toMatch(/clientName=\{client\?\.name\}/);
    expect(contractPage).toMatch(/clientEmail=\{client\?\.email\}/);

    const questionnairePage = read(
      "src/app/(app)/app/questionnaires/[questionnaireId]/page.tsx",
    );
    expect(questionnairePage).toMatch(/name=\{q\.name\}/);
    expect(questionnairePage).toMatch(/email: clients\.email/);

    const proposalList = read("src/components/proposals/proposals-list-table.tsx");
    expect(proposalList).toMatch(/clientEmail: string \| null/);
    expect(proposalList).toMatch(/clientEmail=\{p\.clientEmail \?\? undefined\}/);

    const contractList = read("src/components/contracts/contracts-list-table.tsx");
    expect(contractList).toMatch(/clientEmail: string \| null/);
    expect(contractList).toMatch(/clientEmail=\{c\.clientEmail \?\? undefined\}/);

    const proposalsPage = read("src/app/(app)/app/proposals/page.tsx");
    expect(proposalsPage).toContain("clientEmail: clients.email");
    const contractsPage = read("src/app/(app)/app/contracts/page.tsx");
    expect(contractsPage).toContain("clientEmail: clients.email");
  });

  it("no review status is introduced in send UI or send actions", () => {
    const files = [
      "src/components/proposals/send-proposal-button.tsx",
      "src/components/contracts/send-contract-button.tsx",
      "src/components/questionnaires/send-questionnaire-button.tsx",
      "src/lib/actions/proposals.ts",
      "src/lib/actions/contracts.ts",
      "src/lib/actions/questionnaires.ts",
    ];
    for (const file of files) {
      expect(read(file), file).not.toMatch(/under_review|in_review|status: "review"/);
    }
  });
});
