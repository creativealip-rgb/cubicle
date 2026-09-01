export type WizardState = "method" | "authenticator" | "recovery" | "complete";

const steps: Record<WizardState, { label: string; number: 1 | 2 }> = {
  method: { label: "Choose method", number: 1 },
  authenticator: { label: "Set up authenticator", number: 2 },
  recovery: { label: "Save recovery codes", number: 2 },
  complete: { label: "Complete", number: 2 },
};

export function getWizardStep(state: WizardState) {
  return steps[state];
}

export function canContinueFromRecovery(codes: string[], confirmed: boolean) {
  return codes.length > 0 && confirmed;
}
