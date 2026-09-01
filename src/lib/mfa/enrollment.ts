export function canCompletePasskeyEnrollment(
  authenticated: boolean,
  passkeyCount: number,
) {
  return authenticated && passkeyCount > 0;
}
