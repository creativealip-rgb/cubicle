import { describe, expect, it } from "vitest";
import { defaultDocumentBlocks, normalizeDocumentBlocks } from "@/lib/document-blocks";

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
});
