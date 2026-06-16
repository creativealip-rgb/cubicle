/**
 * Strip internal reasoning / chain-of-thought that some models leak into content.
 * Pure function — safe to import from Client Components.
 *
 * Handles:
 *   - MiniMax-style <think>...</think> blocks
 *   - "### Thinking" / "### Response" style blocks (textual, line-based)
 *   - Leading "Reasoning:" / "Analysis:" meta lines
 */
export function stripThinking(text: string): string {
  if (!text) return text;
  let out = text;

  // 1. Drop <think>...</think> blocks (multiline, non-greedy, all matches)
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // 2. Drop "### Thinking" / "## Thinking" up to next "### Response" / "## Response" or end
  //    Use a simple stateful line-based scan to avoid regex lookbehind hell.
  const lines = out.split("\n");
  const kept: string[] = [];
  let inThinkingBlock = false;
  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s*([A-Za-z][A-Za-z\s-]*)/);
    if (headerMatch) {
      const heading = headerMatch[1].trim().toLowerCase();
      if (/^(thinking|reasoning|analysis|chain[\s-]?of[\s-]?thought)$/.test(heading)) {
        inThinkingBlock = true;
        continue;
      }
      if (inThinkingBlock && /^(response|answer|final)$/.test(heading)) {
        inThinkingBlock = false;
        continue;
      }
    }
    if (!inThinkingBlock) kept.push(line);
  }
  out = kept.join("\n");

  // 3. Drop leading meta lines like "Reasoning:", "Analysis:", "Chain of thought:"
  out = out.replace(
    /^\s*(?:Reasoning|Analysis|Chain[\s-]?of[\s-]?thought)\s*:\s*[\s\S]*?(?=\n\s*\n|\n[A-Z])/,
    "",
  );

  return out.trim();
}
