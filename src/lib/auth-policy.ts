export const IDLE_SESSION_SECONDS = 7 * 24 * 60 * 60;
export const ABSOLUTE_SESSION_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

export function capSessionExpiry(createdAt: Date, requestedExpiry: Date): Date {
  const absoluteExpiry = new Date(createdAt.getTime() + ABSOLUTE_SESSION_SECONDS * 1000);
  return requestedExpiry <= absoluteExpiry ? requestedExpiry : absoluteExpiry;
}
