export type DocumentPlaceholderValues = Record<string, string | number | null | undefined>;

export function resolveDocumentPlaceholders(
  content: string,
  values: DocumentPlaceholderValues,
): string {
  return content.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (match, key: string) => {
    if (!(key in values)) return match;
    const value = values[key];
    return value == null ? "" : String(value);
  });
}
