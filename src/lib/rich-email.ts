/**
 * Helper to parse rich formatting / markdown / HTML tags in email body safely
 * Supporting: Bold, Italic, Underline, Strikethrough, Headings, Lists, Links, and Variables.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatRichEmailHtml(rawText: string): string {
  if (!rawText) return "";

  // If text already contains custom HTML tags from our rich editor, sanitize and convert
  let text = escapeHtml(rawText);

  // Restore allowed safe inline styling tags that were escaped
  text = text
    .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, "<strong>$1</strong>")
    .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, "<strong>$1</strong>")
    .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, "<em>$1</em>")
    .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, "<em>$1</em>")
    .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, "<u>$1</u>")
    .replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/gi, "<s>$1</s>")
    .replace(/&lt;strike&gt;(.*?)&lt;\/strike&gt;/gi, "<s>$1</s>")
    .replace(/&lt;del&gt;(.*?)&lt;\/del&gt;/gi, "<s>$1</s>")
    .replace(/&lt;h1&gt;(.*?)&lt;\/h1&gt;/gi, "<h1 style='font-size:20px;font-weight:700;margin:16px 0 8px 0;color:#0F172A;'>$1</h1>")
    .replace(/&lt;h2&gt;(.*?)&lt;\/h2&gt;/gi, "<h2 style='font-size:17px;font-weight:600;margin:14px 0 6px 0;color:#0F172A;'>$1</h2>")
    .replace(/&lt;blockquote&gt;(.*?)&lt;\/blockquote&gt;/gi, "<blockquote style='border-left:3px solid #2563EB;padding-left:12px;margin:8px 0;color:#475569;font-style:italic;'>$1</blockquote>");

  // Markdown syntax conversions
  // Bold: **text**
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text* or _text_
  text = text.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, "$1<em>$2</em>$3");
  text = text.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, "$1<em>$2</em>$3");
  // Strikethrough: ~~text~~
  text = text.replace(/~~(.*?)~~/g, "<s>$1</s>");
  // Underline: __text__
  text = text.replace(/__(.*?)__/g, "<u>$1</u>");

  // Headers # and ##
  text = text.replace(/^#\s+(.*?)$/gm, "<h1 style='font-size:20px;font-weight:700;margin:16px 0 8px 0;color:#0F172A;'>$1</h1>");
  text = text.replace(/^##\s+(.*?)$/gm, "<h2 style='font-size:17px;font-weight:600;margin:14px 0 6px 0;color:#0F172A;'>$1</h2>");

  // URLs to clickable links
  text = text.replace(
    /((https?:\/\/)[^\s<]+)/g,
    "<a href='$1' style='color:#2563EB;text-decoration:underline;font-weight:500;' target='_blank' rel='noopener noreferrer'>$1</a>"
  );

  // Line breaks
  return text.replace(/\n/g, "<br>");
}
