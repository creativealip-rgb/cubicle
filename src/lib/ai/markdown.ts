export function normalizeAssistantMarkdown(text: string): string {
  return text
    .replace(/(^|\n)\*(?=[^*\s])/g, "$1* ")
    .replace(/([^\n])\s*\*\s+(?=\*{0,2}[A-Z0-9])/g, "$1\n* ");
  // Word-spacing repairs removed: they compensated for streamed deltas being
  // trimmed in ai/client.ts, which is now fixed at the source (trim=false).
}
