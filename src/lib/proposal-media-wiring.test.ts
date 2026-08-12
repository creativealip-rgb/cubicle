import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const editor = () => read("src/components/documents/document-block-editor.tsx");
const proposalAction = () => read("src/lib/actions/proposals.ts");
const proposalEditPage = () => read("src/app/(app)/app/proposals/[proposalId]/edit/page.tsx");
const contractEditPage = () => read("src/app/(app)/app/contracts/[contractId]/edit/page.tsx");
const uploadLib = () => read("src/lib/files-upload.ts");

describe("proposal media upload wiring", () => {
  it("editor uploads through the shared workspace upload helper with quota messages", () => {
    const src = editor();
    // Real upload path, not a manual URL input.
    expect(src).toContain("uploadOneFile(");
    expect(src).toContain("MAX_UPLOAD_BYTES");
    // The active language is passed through so the shared helper localizes
    // quota-block responses before the editor surfaces the error message.
    expect(src).toContain("uploadOneFile(\n        file,");
    expect(src).toContain("lang");
    // Uploads land as workspace-scoped internal working files.
    expect(src).toContain('visibility: "internal"');
    expect(src).toContain('fileType: "working_file"');
    // Progress is surfaced while uploading.
    expect(src).toContain("uploadProgress");
    expect(src).toContain("setUploadProgress");
  });

  it("editor builds media blocks from the returned file record", () => {
    const src = editor();
    expect(src).toContain("buildDocumentMediaBlock(");
    expect(src).toContain("block.fileId");
    expect(src).toContain("block.src");
  });

  it("editor renders uploaded images and attachments and supports delete/reorder", () => {
    const src = editor();
    // Image preview from the same-origin file proxy.
    expect(src).toContain("isSafeImageBlock");
    expect(src).toContain("<img");
    expect(src).toContain('src={block.src}');
    // Attachment download link via the workspace-scoped download route.
    expect(src).toContain("`/api/files/${block.fileId}/download`");
    // Delete + reorder controls for non-signature blocks.
    expect(src).toContain("Hapus");
    expect(src).toContain("ArrowUp");
    expect(src).toContain("ArrowDown");
  });

  it("proposal and contract edit pages pass the workspace id into the editor", () => {
    expect(proposalEditPage()).toContain('workspaceId={workspaceId}');
    expect(contractEditPage()).toContain('workspaceId={workspaceId}');
  });

  it("saveProposalBlocks rejects image blocks that do not point at the workspace file proxy", () => {
    const src = proposalAction();
    expect(src).toContain("isSameOriginMediaSrc");
    expect(src).toContain('Gambar hanya bisa dari file workspace');
    // The guard runs after normalization and before the CAS update.
    expect(src.indexOf("isSameOriginMediaSrc")).toBeGreaterThan(src.indexOf("normalizeDocumentBlocks"));
    expect(src.indexOf("isSameOriginMediaSrc")).toBeLessThan(src.indexOf("contentRevision, expectedRevision"));
  });

  it("uploadOneFile returns the created file record so media blocks can be built", () => {
    const src = uploadLib();
    expect(src).toContain("Promise<UploadedFileRecord>");
    expect(src).toContain("data?.file");
    expect(src).toContain("resolve(record)");
  });
});
