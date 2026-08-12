import { describe, expect, it } from "vitest";
import { renderDocumentBlock } from "@/lib/document-block-renderer";

describe("renderDocumentBlock", () => {
  it("resolves placeholders in text blocks", () => {
    expect(renderDocumentBlock({ id: "1", type: "text", content: "Hi {{client_name}}" }, { client_name: "Alip" })).toBe("Hi Alip");
  });

  it("renders list blocks", () => {
    expect(renderDocumentBlock({ id: "1", type: "list", items: ["A", "B"] }, {})).toBe("• A\n• B");
  });
});
