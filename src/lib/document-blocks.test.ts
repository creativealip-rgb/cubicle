import { describe, expect, it } from "vitest";
import {
  buildDocumentMediaBlock,
  defaultDocumentBlocks,
  isSafeAttachmentMeta,
  isSafeImageBlock,
  normalizeDocumentBlocks,
} from "@/lib/document-blocks";

describe("document blocks", () => {
  it("filters blocks unsupported by contract", () => {
    const blocks = normalizeDocumentBlocks([
      { id: "1", type: "text", content: "A" },
      { id: "2", type: "image", src: "/a.png" },
      { id: "3", type: "signature" },
    ], "contract");
    expect(blocks.map((block) => block.type)).toEqual(["text", "signature"]);
  });

  it("provides editable defaults", () => {
    expect(defaultDocumentBlocks("proposal")).toHaveLength(2);
    expect(defaultDocumentBlocks("contract").some((block) => block.type === "signature")).toBe(true);
  });

  describe("buildDocumentMediaBlock", () => {
    const file = {
      id: "file-1",
      name: "foto.png",
      storageKey: "workspaces/ws-1/files/file-1/foto.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    };

    it("builds a safe image block from an uploaded file record", () => {
      const block = buildDocumentMediaBlock("image", file);
      expect(block.type).toBe("image");
      expect(block.src).toBe("/api/files/raw/workspaces/ws-1/files/file-1/foto.png");
      expect(block.fileId).toBe("file-1");
      expect(block.fileName).toBe("foto.png");
      expect(block.mimeType).toBe("image/png");
      expect(block.sizeBytes).toBe(1024);
      expect(isSafeImageBlock(block)).toBe(true);
      // A normalized save must keep the block.
      expect(normalizeDocumentBlocks([block], "proposal")).toHaveLength(1);
    });

    it("builds a safe attachment block from an uploaded file record", () => {
      const block = buildDocumentMediaBlock("attachment", file);
      expect(block.type).toBe("attachment");
      expect(block.src).toBe("/api/files/raw/workspaces/ws-1/files/file-1/foto.png");
      expect(isSafeAttachmentMeta(block)).toBe(true);
    });

    it("accepts an already-absolute same-origin src", () => {
      const block = buildDocumentMediaBlock("image", {
        ...file,
        storageKey: "/api/files/raw/workspaces/ws-1/files/file-1/foto.png",
      });
      expect(block.src).toBe("/api/files/raw/workspaces/ws-1/files/file-1/foto.png");
    });

    it("rejects incomplete file records", () => {
      expect(() => buildDocumentMediaBlock("image", { id: "", name: "a", storageKey: "k" })).toThrow();
      expect(() => buildDocumentMediaBlock("image", { id: "i", name: "", storageKey: "k" })).toThrow();
      expect(() => buildDocumentMediaBlock("image", { id: "i", name: "a", storageKey: "" })).toThrow();
    });

    it("produces blocks that survive normalization and render checks", () => {
      const image = buildDocumentMediaBlock("image", file);
      const attachment = buildDocumentMediaBlock("attachment", { ...file, name: "lampiran.pdf", mimeType: "application/pdf", sizeBytes: 2048 });
      const normalized = normalizeDocumentBlocks([image, attachment], "proposal");
      expect(normalized.map((b) => b.type)).toEqual(["image", "attachment"]);
      expect(isSafeImageBlock(image)).toBe(true);
      expect(isSafeAttachmentMeta(attachment)).toBe(true);
    });
  });
});
