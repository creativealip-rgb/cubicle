import { describe, expect, it } from "vitest";
import {
  buildInvoiceBackUrl,
  buildInvoiceDetailUrl,
  parseInvoiceOrigin,
} from "./invoice-origin";

const PROJECT_ID = "123e4567-e89b-42d3-a456-426614174000";
const CLIENT_ID = "123e4567-e89b-42d3-b456-426614174001";
const INVOICE_ID = "123e4567-e89b-42d3-8456-426614174002";

describe("invoice origin policy", () => {
  it("parses supported origins with required resource IDs", () => {
    expect(parseInvoiceOrigin({ origin: "project", projectId: PROJECT_ID })).toEqual({
      type: "project",
      resourceId: PROJECT_ID,
    });
    expect(parseInvoiceOrigin({ origin: "client", clientId: CLIENT_ID })).toEqual({
      type: "client",
      resourceId: CLIENT_ID,
    });
    expect(parseInvoiceOrigin({ origin: "global" })).toEqual({ type: "global" });
  });

  it.each([
    {},
    { origin: "other" },
    { origin: "project" },
    { origin: "client" },
    { origin: "project", clientId: CLIENT_ID },
    { origin: "client", projectId: PROJECT_ID },
    { origin: "project", projectId: "not-a-uuid" },
    { origin: "client", clientId: "123e4567-e89b-02d3-a456-426614174000" },
    { origin: ["project"], projectId: PROJECT_ID },
  ])("rejects missing or malformed origin params: %o", (params) => {
    expect(parseInvoiceOrigin(params)).toBeNull();
  });

  it("builds stable contextual Back URLs", () => {
    expect(buildInvoiceBackUrl({ type: "project", resourceId: PROJECT_ID })).toBe(
      `/app/projects/${PROJECT_ID}?tab=billing`,
    );
    expect(buildInvoiceBackUrl({ type: "client", resourceId: CLIENT_ID })).toBe(
      `/app/clients/${CLIENT_ID}?tab=invoices`,
    );
    expect(buildInvoiceBackUrl({ type: "global" })).toBe("/app/invoices");
    expect(buildInvoiceBackUrl(null)).toBe("/app/invoices");
  });

  it("builds explicit encoded detail URLs", () => {
    expect(buildInvoiceDetailUrl(INVOICE_ID, { type: "project", resourceId: PROJECT_ID })).toBe(
      `/app/invoices/${INVOICE_ID}?origin=project&projectId=${PROJECT_ID}`,
    );
    expect(buildInvoiceDetailUrl(INVOICE_ID, { type: "client", resourceId: CLIENT_ID })).toBe(
      `/app/invoices/${INVOICE_ID}?origin=client&clientId=${CLIENT_ID}`,
    );
    expect(buildInvoiceDetailUrl(INVOICE_ID, { type: "global" })).toBe(
      `/app/invoices/${INVOICE_ID}?origin=global`,
    );
  });
});
