import type { DocumentPlaceholderValues } from "@/lib/document-placeholders";

/**
 * Shared placeholder value builder for proposals and contracts.
 *
 * ONE source of truth for the `{{...}}` values used by editor preview, public
 * page, email body, and PDF rendering — the plan requires identical output
 * across every surface (design doc "Placeholder model").
 *
 * Pure module: no `"use server"`, no next/, no drizzle imports. Date strings
 * are built from an injectable `now` so tests stay deterministic.
 */

export interface DocumentValueSource {
  clientName?: string | null;
  clientEmail?: string | null;
  companyName?: string | null;
  proposalNumber?: string | null;
  contractNumber?: string | null;
  contractDate?: string | Date | null;
  validUntil?: string | Date | null;
  workspaceName?: string | null;
  workspaceAddress?: string | null;
  today?: string | Date | null;
  subtotal?: string | number | null;
  tax?: string | number | null;
  total?: string | number | null;
  downPaymentAmount?: string | number | null;
}

function formatIdDate(value: string | Date | null | undefined, _now: Date): string {
  if (!value) return "";
  // Date-only strings ("2026-09-12") are parsed as UTC midnight so the
  // calendar day is stable regardless of the server's local timezone; the
  // product locale is id-ID/Asia/Jakarta. Date objects carry their own instant.
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

/** Shared financial placeholder values (today, subtotal, tax, total, down payment). */
function financialPlaceholderValues(source: DocumentValueSource, now: Date): DocumentPlaceholderValues {
  return {
    today: source.today instanceof Date ? formatIdDate(source.today, now) : source.today == null ? "" : String(source.today),
    subtotal: formatMoney(source.subtotal),
    tax: formatMoney(source.tax),
    total_amount: formatMoney(source.total),
    down_payment: formatMoney(source.downPaymentAmount),
  };
}

/**
 * Build the placeholder values shared by a proposal.
 *
 * `proposalNumber` is only injected when a number exists; the resolver keeps
 * unknown placeholders visible, so a draft without a number renders the literal
 * `{{proposal_number}}` token instead of silently dropping it (matches the
 * resolver contract in document-placeholders.ts).
 */
export function buildProposalPlaceholderValues(
  source: DocumentValueSource,
  now: Date = new Date(),
): DocumentPlaceholderValues {
  const values: DocumentPlaceholderValues = {
    client_name: source.clientName ?? "",
    client_email: source.clientEmail ?? "",
    company_name: source.companyName ?? "",
    valid_until: formatIdDate(source.validUntil, now),
    workspace_name: source.workspaceName ?? "",
    workspace_address: source.workspaceAddress ?? "",
    ...financialPlaceholderValues(source, now),
  };
  if (source.proposalNumber != null && source.proposalNumber !== "") {
    values.proposal_number = source.proposalNumber;
  }
  return values;
}

export function buildContractPlaceholderValues(
  source: DocumentValueSource,
  now: Date = new Date(),
): DocumentPlaceholderValues {
  const values: DocumentPlaceholderValues = {
    client_name: source.clientName ?? "",
    client_email: source.clientEmail ?? "",
    company_name: source.companyName ?? "",
    valid_until: formatIdDate(source.validUntil, now),
    workspace_name: source.workspaceName ?? "",
    workspace_address: source.workspaceAddress ?? "",
    ...financialPlaceholderValues(source, now),
  };
  if (source.contractNumber != null && source.contractNumber !== "") {
    values.contract_number = source.contractNumber;
  }
  if (source.contractDate != null && source.contractDate !== "") {
    values.contract_date = formatIdDate(source.contractDate, now);
  }
  return values;
}
