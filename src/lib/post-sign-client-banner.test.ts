import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const contractPage = readFileSync(
  "src/app/(app)/app/contracts/[contractId]/page.tsx",
  "utf8",
);
const proposalPage = readFileSync(
  "src/app/(app)/app/proposals/[proposalId]/page.tsx",
  "utf8",
);
const proposalAcceptButtons = readFileSync(
  "src/components/proposals/accept-decline-buttons.tsx",
  "utf8",
);
const proposalPublicView = readFileSync(
  "src/components/proposals/proposal-public-view.tsx",
  "utf8",
);
const contractDetailBanner = readFileSync(
  "src/components/contracts/post-sign-client-banner.tsx",
  "utf8",
);
const contractActions = readFileSync("src/lib/actions/contracts.ts", "utf8");

describe("post-sign client banner wiring", () => {
  it("contract detail imports the post-sign client banner", () => {
    expect(contractPage).toContain(
      'import { PostSignClientBanner } from "@/components/contracts/post-sign-client-banner";',
    );
    expect(contractPage).toContain("<PostSignClientBanner");
  });

  it("contract detail gates the banner to signed contracts without a linked client", () => {
    expect(contractPage).toContain(
      'c.status === "signed" && !c.clientId',
    );
    expect(contractPage).toContain("canWrite");
  });

  it("banner is a client component calling the protected server action", () => {
    expect(contractDetailBanner).toContain('"use client";');
    expect(contractDetailBanner).toContain("createClientFromSignedContract");
    expect(contractDetailBanner).toContain('"Tambah client"');
    expect(contractDetailBanner).toContain('"Nanti"');
  });

  it("server action stays signed-only, workspace-scoped and writable-guarded", () => {
    const actionStart = contractActions.indexOf(
      "export async function createClientFromSignedContract",
    );
    const actionBody = contractActions.slice(
      actionStart,
      contractActions.indexOf("export async function revokeContract", actionStart),
    );
    expect(actionBody).toContain("eq(contracts.status, \"signed\")");
    expect(actionBody).toContain("eq(contracts.workspaceId, workspaceId)");
    expect(actionBody).toContain("assertWorkspaceWritable");
    expect(actionBody).toContain('if (contract.clientId) return { clientId: contract.clientId, created: false };');
  });

  it("proposal acceptance and proposal pages never render the banner", () => {
    expect(proposalPage).not.toContain("PostSignClientBanner");
    expect(proposalAcceptButtons).not.toContain("PostSignClientBanner");
    expect(proposalAcceptButtons).not.toContain("createClientFromSignedContract");
    expect(proposalPublicView).not.toContain("PostSignClientBanner");
  });
});
