export type ClientPortalPasswordState = "none" | "legacy" | "revealable";

export function resolveClientPortalActive(client: {
  portalEnabled: boolean;
  portalPasswordHash: string | null;
  portalTokenRevokedAt?: Date | string | null;
}): boolean {
  return client.portalEnabled && Boolean(client.portalPasswordHash) && !client.portalTokenRevokedAt;
}

export function resolveClientPortalPasswordState(client: {
  portalEnabled: boolean;
  portalPasswordHash: string | null;
  portalPasswordCiphertext: string | null;
}): ClientPortalPasswordState {
  if (!client.portalEnabled || !client.portalPasswordHash) return "none";
  return client.portalPasswordCiphertext ? "revealable" : "legacy";
}
