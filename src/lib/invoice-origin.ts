export type InvoiceOrigin =
  | { type: "project"; resourceId: string }
  | { type: "client"; resourceId: string }
  | { type: "global" };

type InvoiceOriginParams = Record<string, string | string[] | undefined>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function parseInvoiceOrigin(params: InvoiceOriginParams): InvoiceOrigin | null {
  if (params.origin === "global") return { type: "global" };
  if (params.origin === "project" && isUuid(params.projectId)) {
    return { type: "project", resourceId: params.projectId };
  }
  if (params.origin === "client" && isUuid(params.clientId)) {
    return { type: "client", resourceId: params.clientId };
  }
  return null;
}

export function buildInvoiceBackUrl(origin: InvoiceOrigin | null): string {
  if (origin?.type === "project") {
    return `/app/projects/${origin.resourceId}?tab=billing`;
  }
  if (origin?.type === "client") {
    return `/app/clients/${origin.resourceId}?tab=invoices`;
  }
  return "/app/invoices";
}

export function buildInvoiceDetailUrl(invoiceId: string, origin: InvoiceOrigin): string {
  const params = new URLSearchParams({ origin: origin.type });
  if (origin.type === "project") params.set("projectId", origin.resourceId);
  if (origin.type === "client") params.set("clientId", origin.resourceId);
  return `/app/invoices/${invoiceId}?${params.toString()}`;
}
