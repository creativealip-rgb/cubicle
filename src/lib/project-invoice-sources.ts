import { z } from "zod";

const projectId = z.string().uuid();
const positiveNumber = z.number().finite().positive();
const fixedValueVariants = (mode: "fixed_dp" | "fixed_milestone") => [
  z.object({ mode: z.literal(mode), projectId, amountType: z.literal("percent"), value: positiveNumber.max(100), milestoneName: z.string().trim().min(1).optional() }).strict(),
  z.object({ mode: z.literal(mode), projectId, amountType: z.literal("amount"), value: positiveNumber, milestoneName: z.string().trim().min(1).optional() }).strict(),
  z.object({ mode: z.literal(mode), projectId, percentage: positiveNumber.max(100), milestoneName: z.string().trim().min(1).optional() }).strict(),
  z.object({ mode: z.literal(mode), projectId, amount: positiveNumber, milestoneName: z.string().trim().min(1).optional() }).strict(),
] as const;

export const ProjectInvoiceSourceSchema = z.union([
  z.object({ mode: z.literal("fixed_full"), projectId }).strict(),
  ...fixedValueVariants("fixed_dp"),
  ...fixedValueVariants("fixed_milestone"),
  z.object({ mode: z.literal("fixed_final"), projectId }).strict(),
  z.object({
    mode: z.literal("hourly_timesheet"), projectId,
    periodStart: z.iso.date(), periodEnd: z.iso.date(),
    timeEntryIds: z.array(z.string().uuid()).min(1),
  }).strict().refine((value) => value.periodStart < value.periodEnd, { message: "periodEnd harus setelah periodStart", path: ["periodEnd"] }),
  z.object({ mode: z.literal("hourly_deposit"), projectId, description: z.string().trim().min(1).optional(), amount: positiveNumber }).strict(),
]);

export type ProjectInvoiceSource = z.infer<typeof ProjectInvoiceSourceSchema>;

function toMinor(value: string | number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Invalid monetary amount");
  return Math.round(parsed * 100);
}
function fromMinor(value: number): string { return (value / 100).toFixed(2); }

type FixedMode =
  | { mode: "fixed_full" | "fixed_final" }
  | { mode: "fixed_dp" | "fixed_milestone"; amountType?: "percent" | "amount"; value?: number; percentage?: number; amount?: number };

export function resolveFixedSourceAmount(source: FixedMode, context: { agreedAmount: string | number; priorActiveOriginalAmounts: Array<string | number> }): string {
  const agreed = toMinor(context.agreedAmount);
  const prior = context.priorActiveOriginalAmounts.reduce<number>((sum, amount) => sum + toMinor(amount), 0);
  const remaining = agreed - prior;
  if (remaining <= 0) throw new Error("Fixed source has no remaining amount");
  if (source.mode === "fixed_full") {
    if (prior !== 0) throw new Error("Fixed full is unavailable when active history exists");
    return fromMinor(agreed);
  }
  if (source.mode === "fixed_final") return fromMinor(remaining);
  const variableSource = source as Extract<FixedMode, { mode: "fixed_dp" | "fixed_milestone" }>;
  const percent = variableSource.amountType === "percent" ? variableSource.value : variableSource.percentage;
  const amount = variableSource.amountType === "amount" ? variableSource.value : variableSource.amount;
  const resolved = percent !== undefined ? Math.round(agreed * percent / 100) : amount !== undefined ? toMinor(amount) : 0;
  if (resolved <= 0 || resolved > remaining) throw new Error("Fixed source amount exceeds remaining");
  return fromMinor(resolved);
}
