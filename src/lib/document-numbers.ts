/**
 * Pure helpers for proposal/contract document numbers.
 *
 * Keep this module free of `"use server"`, next/, and drizzle imports so it
 * can be imported from client components and unit-tested in isolation.
 *
 * Number format follows the invoice precedent: `INV-####` → `PROP-YYYY-####`
 * / `CONT-YYYY-####`. The year prefix makes the workspace-scoped unique index
 * (0074) collision-resistant across years while keeping numbers human-legible.
 */

export function currentDocumentYear(now: Date = new Date()): number {
  return now.getFullYear();
}

export function buildProposalNumber(year: number, sequence: number): string {
  return `PROP-${year}-${String(sequence).padStart(4, "0")}`;
}

export function buildContractNumber(year: number, sequence: number): string {
  return `CONT-${year}-${String(sequence).padStart(4, "0")}`;
}

export function isAutoDocumentNumber(value: string): boolean {
  return /^(PROP|CONT)-\d{4}-\d{4,}$/.test(value);
}

/**
 * The next free sequence for a number series.
 *
 * Mirrors the invoice counter logic (src/lib/actions/invoices.ts): the counter
 * row is authoritative, but we always bump above the max existing sequence so
 * seed data / manual inserts cannot collide with the unique index
 * (`proposals_workspace_proposal_number_unique` / `contracts_workspace_contract_number_unique`).
 *
 * `sequenceFrom` is the per-kind extraction callback: it pulls the trailing
 * sequence from a stored document number (e.g. "PROP-2026-0042" → 42). Rows
 * with a number that does not match the series are ignored.
 */
export function nextDocumentSequence(
  counterNext: number | null | undefined,
  existingNumbers: Array<string | null | undefined>,
  sequenceFrom: (number: string) => number | null,
): number {
  let max = 0;
  for (const raw of existingNumbers) {
    if (!raw) continue;
    const seq = sequenceFrom(raw);
    if (seq !== null && seq > max) max = seq;
  }
  return Math.max(counterNext ?? 1, max + 1);
}

/** Extract the trailing `####` from a `PROP-YYYY-####` number, or null. */
export function proposalNumberSequence(number: string): number | null {
  const m = /^PROP-\d{4}-(\d{4,})$/.exec(number.trim());
  return m ? Number(m[1]) : null;
}

/** Extract the trailing `####` from a `CONT-YYYY-####` number, or null. */
export function contractNumberSequence(number: string): number | null {
  const m = /^CONT-\d{4}-(\d{4,})$/.exec(number.trim());
  return m ? Number(m[1]) : null;
}
