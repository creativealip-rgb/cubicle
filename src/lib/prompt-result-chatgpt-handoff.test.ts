import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/prompts/prompt-result.tsx", "utf8");

describe("Prompt Studio ChatGPT handoff", () => {
  it("builds a brief-aware ready-to-paste prompt", () => {
    expect(source).toContain("function readyPrompt");
    expect(source).toContain("result.readyOutput.map");
    expect(source).toContain("objective, platform, tone, style, format, ratio, and constraint");
  });

  it("copies safely and opens ChatGPT without prompt in URL", () => {
    expect(source).toContain('window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer")');
    expect(source).toContain("await writeClipboard(chatGptPrompt)");
    expect(source).not.toContain("chatgpt.com/?q=");
  });
});
