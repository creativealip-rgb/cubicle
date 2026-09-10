export function formatMinutesCompact(minutes: number) {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
}

export function getProjectOverviewBilling(input: {
  model: "retainer" | "hourly" | "fixed_price";
  includedMinutes: number;
  usedMinutes: number;
  billableAmount: number;
  invoicedAmount: number;
  fixedAmount?: number;
}) {
  const configuredAmount = input.model === "hourly" ? input.billableAmount : input.model === "retainer" ? input.billableAmount : input.fixedAmount ?? 0;
  const percent = input.model === "retainer"
    ? input.includedMinutes > 0 ? Math.min(100, Math.round(input.usedMinutes / input.includedMinutes * 100)) : 0
    : configuredAmount > 0 ? Math.min(100, Math.round(input.invoicedAmount / configuredAmount * 100)) : 0;
  return {
    configuredAmount,
    percent,
    progressLead: input.model === "retainer" ? `${formatMinutesCompact(input.usedMinutes)} / ${formatMinutesCompact(input.includedMinutes)}` : undefined,
  };
}
