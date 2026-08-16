export type DocumentPlaceholderValues = Record<string, string | number | null | undefined>;

export function resolveDocumentPlaceholders(
  content: string,
  values: DocumentPlaceholderValues,
): string {
  return content.replace(/{{\s*([a-z0-9_.]+)\s*}}/gi, (match, key: string) => {
    // Accept both underscore (`{{client_name}}`) and dot (`{{client.name}}`)
    // spellings — users often type dots, so normalize them for lookup.
    const normalized = key.replace(/\./g, "_");
    if (!(normalized in values)) return match;
    const value = values[normalized];
    return value == null ? "" : String(value);
  });
}
