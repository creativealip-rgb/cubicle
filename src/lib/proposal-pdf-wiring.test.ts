import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const routeSource = () =>
  read("src/app/api/proposals/[proposalId]/pdf/route.ts");
const componentSource = () =>
  read("src/components/proposals/proposal-pdf.tsx");
const libSource = () => read("src/lib/pdf/proposal-pdf.ts");
const pageSource = () =>
  read("src/app/(app)/app/proposals/[proposalId]/page.tsx");

describe("proposal PDF route wiring", () => {
  it("exposes a GET route with nodejs runtime and no caching", () => {
    const src = routeSource();
    expect(src).toContain("export async function GET(");
    expect(src).toContain('export const dynamic = "force-dynamic"');
    expect(src).toContain('export const runtime = "nodejs"');
  });

  it("requires an authenticated session (401)", () => {
    const src = routeSource();
    expect(src).toContain("auth.api.getSession");
    expect(src).toContain('status: 401');
  });

  it("404s when the proposal is missing", () => {
    const src = routeSource();
    expect(src).toContain('eq(proposals.id, proposalId)');
    expect(src).toContain('status: 404');
  });

  it("enforces workspace membership before rendering (403)", () => {
    const src = routeSource();
    expect(src).toContain("workspaceMembers");
    expect(src).toContain("eq(workspaceMembers.workspaceId, p.workspaceId)");
    expect(src).toContain("eq(workspaceMembers.userId, session.user.id)");
    expect(src).toContain('status: 403');
    // Guard must run before the render call.
    expect(src.indexOf("workspaceMembers")).toBeLessThan(
      src.indexOf("renderProposalPdf"),
    );
  });

  it("renders contentBlocks with legacy body fallback", () => {
    const src = componentSource();
    expect(src).toContain("normalizeDocumentBlocks(proposal.contentBlocks, \"proposal\")");
    expect(src).toContain("renderDocumentBlock");
    expect(src).toContain("proposal.body");
    // Block path takes precedence over the legacy body fallback.
    const blocksIdx = src.indexOf("normalizeDocumentBlocks");
    const fallbackIdx = src.indexOf("proposal.body");
    expect(blocksIdx).toBeGreaterThan(-1);
    expect(fallbackIdx).toBeGreaterThan(blocksIdx);
  });

  it("renders line items and the down-payment block", () => {
    const src = componentSource();
    expect(src).toContain("lineItems");
    expect(src).toContain("Subtotal");
    expect(src).toContain("downPaymentPercent");
  });

  it("wraps the component with renderToBuffer in the lib helper", () => {
    const src = libSource();
    expect(src).toContain('from "@react-pdf/renderer"');
    expect(src).toContain("renderToBuffer");
    expect(src).toContain("renderProposalPdf");
    expect(src).toContain("ProposalPDF(data)");
  });

  it("wires the Download PDF button on the proposal detail page", () => {
    const src = pageSource();
    expect(src).toContain(`/api/proposals/${"${p.id}"}/pdf`);
    expect(src).toContain("FileText");
    expect(src).toContain('t("Unduh PDF", "Download PDF")');
  });
});
