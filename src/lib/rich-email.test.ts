import { describe, expect, it } from "vitest";
import { formatRichEmailHtml } from "@/lib/rich-email";

describe("formatRichEmailHtml", () => {
  it("formats explicit rich markers", () => {
    expect(formatRichEmailHtml("**bold** _italic_ <u>under</u> ~~gone~~")).toBe(
      "<strong>bold</strong> <em>italic</em> <u>under</u> <s>gone</s>",
    );
  });

  it("keeps underscores inside identifiers literal", () => {
    expect(formatRichEmailHtml("Invoice INV_2026_001 and file_name plus __init__")).toBe(
      "Invoice INV_2026_001 and file_name plus __init__",
    );
  });

  it("escapes arbitrary HTML before restoring allowed editor tags", () => {
    expect(formatRichEmailHtml('<script>alert("x")</script><b>safe</b>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<strong>safe</strong>",
    );
  });
});
