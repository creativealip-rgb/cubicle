function decimal(value: string, scale: number) {
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * BigInt(10 ** scale) +
    BigInt((fraction + "0".repeat(scale)).slice(0, scale))
  );
}
function money(cents: bigint) {
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
export function budgetTargets(
  income: string,
  needs: string,
  wants: string,
  savings: string,
) {
  const percentages = [needs, wants, savings].map((v) => decimal(v, 2));
  if (percentages.reduce((a, b) => a + b, BigInt(0)) !== BigInt(10000))
    throw new Error("Allocations must total 100");
  const incomeCents = decimal(income, 2),
    target = (percent: bigint) =>
      money((incomeCents * percent + BigInt(5000)) / BigInt(10000));
  return {
    needs: target(percentages[0]),
    wants: target(percentages[1]),
    savings: target(percentages[2]),
  };
}
