export type DocumentPlaceholderValues = Record<string, string | number | null | undefined>;

export function resolveDocumentPlaceholders(
  content: string,
  values: DocumentPlaceholderValues,
): string {
  return content.replace(/{{\s*([a-z0-9_.]+)\s*}}/gi, (match, rawKey: string) => {
    const aliases: Record<string, string> = {
      "client.name": "client_name",
      "client.email": "client_email",
      "company.name": "company_name",
      "workspace.name": "workspace_name",
      "workspace.address": "workspace_address",
      "proposal.number": "proposal_number",
      "contract.number": "contract_number",
      "contract.date": "contract_date",
    };
    const key = aliases[rawKey.toLowerCase()] ?? rawKey.toLowerCase();
    if (!(key in values)) return match;
    const value = values[key];
    return value == null ? "" : String(value);
  });
}
