export function calculateServiceProfitability(input: {
  soldAmount: number;
  actualMinutes: number;
  costRatePerHour: number;
  estimatedMinutes: number | null;
}) {
  const costAmount = Math.round((input.actualMinutes / 60) * input.costRatePerHour);
  const marginAmount = input.soldAmount - costAmount;
  return {
    soldAmount: input.soldAmount,
    costAmount,
    marginAmount,
    marginPercent: input.soldAmount > 0 ? Math.round((marginAmount / input.soldAmount) * 10000) / 100 : 0,
    estimatedMinutes: input.estimatedMinutes,
    actualMinutes: input.actualMinutes,
    varianceMinutes: input.estimatedMinutes == null ? null : input.actualMinutes - input.estimatedMinutes,
  };
}
