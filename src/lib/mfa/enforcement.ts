import { decideMfaPolicy } from "@/lib/mfa/policy";

const MFA_ENABLED = process.env.MFA_ENFORCEMENT_ENABLED === "true";

export function shouldRequireMfaSetup(input: {
  route: string;
  enrolled: boolean;
  isNewUser: boolean;
  graceDeadline?: Date | null;
  now?: Date;
}) {
  return decideMfaPolicy({
    enabled: MFA_ENABLED,
    route: input.route,
    enrolled: input.enrolled,
    isNewUser: input.isNewUser,
    graceDeadline: input.graceDeadline,
    now: input.now ?? new Date(),
  }).action === "enroll";
}

export { MFA_ENABLED };
