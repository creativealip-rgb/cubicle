export type MfaAuthMethod = "google" | "password" | "other";

export type MfaPolicyInput = {
  enabled: boolean;
  isNewUser: boolean;
  enrolled: boolean;
  graceDeadline?: Date | null;
  now: Date;
  route: string;
  authMethod?: MfaAuthMethod;
};

export type MfaPolicyDecision = "allow" | "enroll";

const PUBLIC_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const MFA_ALLOWED_PREFIXES = ["/mfa/setup", "/mfa/recovery", "/logout"];

export function isMfaRouteAllowed(route: string): boolean {
  return MFA_ALLOWED_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function isPublicRoute(route: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

export function decideMfaPolicy(input: MfaPolicyInput): { action: MfaPolicyDecision } {
  if (!input.enabled || input.enrolled || isPublicRoute(input.route) || isMfaRouteAllowed(input.route)) {
    return { action: "allow" };
  }
  if (input.isNewUser || !input.graceDeadline || input.now >= input.graceDeadline) {
    return { action: "enroll" };
  }
  return { action: "allow" };
}
