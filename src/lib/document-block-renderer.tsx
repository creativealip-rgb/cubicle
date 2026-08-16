import type { DocumentBlock } from "@/lib/document-blocks";
import { isSafeAttachmentMeta, isSafeImageBlock } from "@/lib/document-blocks";
import { resolveDocumentPlaceholders, type DocumentPlaceholderValues } from "@/lib/document-placeholders";

/**
 * Text/plain rendering used by PDF (react-pdf <Text>) and legacy fallbacks.
 * Media blocks render as their display label or a safe marker — PDF cannot
 * resolve signed download URLs at render time.
 */
export function renderDocumentBlock(block: DocumentBlock, values: DocumentPlaceholderValues): string {
  if (block.type === "placeholder" || block.type === "text" || block.type === "heading") {
    return resolveDocumentPlaceholders(block.content ?? "", values);
  }
  if (block.type === "list") {
    const items = (block.items ?? []).map((item) => resolveDocumentPlaceholders(item, values));
    if (block.ordered) {
      return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
    }
    return items.map((item) => `• ${item}`).join("\n");
  }
  if (block.type === "divider") return "──────────";
  if (block.type === "signature") return "[Signature]";
  if (block.type === "table") {
    const rows = block.rows ?? [];
    if (rows.length === 0) return "";
    return rows.map((row) => row.map((cell) => resolveDocumentPlaceholders(cell, values)).join(" | ")).join("\n");
  }
  if (block.type === "image") {
    if (isSafeImageBlock(block)) {
      return block.fileName ? `[Gambar: ${block.fileName}]` : "[Gambar]";
    }
    return "[Gambar tidak valid]";
  }
  if (block.type === "attachment") {
    if (isSafeAttachmentMeta(block)) {
      return `[Lampiran: ${block.fileName ?? "file"}]`;
    }
    return "[Lampiran tidak valid]";
  }
  return block.content ?? "";
}

/**
 * HTML/JSX rendering for the web (editor preview, detail, public proposal).
 * Returns null for blocks that render nothing (divider) or cannot be rendered
 * safely (invalid media) so callers can skip them.
 */
export function renderDocumentBlockHtml(
  block: DocumentBlock,
  values: DocumentPlaceholderValues,
): React.ReactNode {
  if (block.type === "divider") {
    return <hr className="my-4 border-slate-200" />;
  }
  if (block.type === "image") {
    if (isSafeImageBlock(block)) {
      return (
        <figure className="my-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.fileName ?? "Gambar"} className="max-w-full rounded-lg border border-slate-200" />
        </figure>
      );
    }
    return <p className="text-sm text-amber-700">Gambar tidak valid — hanya file workspace yang didukung.</p>;
  }
  if (block.type === "attachment") {
    if (isSafeAttachmentMeta(block)) {
      return (
        <p className="my-2">
          <a
            href={`/api/files/${block.fileId}/download`}
            className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            📎 {block.fileName ?? "Lampiran"}
          </a>
        </p>
      );
    }
    return <p className="text-sm text-amber-700">Lampiran tidak valid.</p>;
  }
  if (block.type === "table") {
    const rows = block.rows ?? [];
    if (rows.length === 0) return null;
    return (
      <div className="my-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i === 0 ? "bg-slate-50" : undefined}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-slate-200 px-3 py-2">
                    {resolveDocumentPlaceholders(cell, values)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "list") {
    const items = (block.items ?? []).map((item) => resolveDocumentPlaceholders(item, values));
    if (items.length === 0) return null;
    if (block.ordered) {
      return (
        <ol className="my-2 list-decimal pl-6 space-y-1">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    }
    return (
      <ul className="my-2 list-disc pl-6 space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "signature") {
    return <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">Tempat tanda tangan client</div>;
  }
  const textAlignClass = block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : block.align === "left" ? "text-left" : "";
  return <div className={`whitespace-pre-wrap ${textAlignClass}`}>{renderDocumentBlock(block, values)}</div>;
}
