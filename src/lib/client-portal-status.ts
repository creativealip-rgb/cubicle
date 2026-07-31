export type ClientPortalPasswordState = "none" | "legacy" | "revealable";

export function resolveClientPortalPasswordState(client: {
  portalEnabled: boolean;
  portalPasswordHash: string | null;
  portalPasswordCiphertext: string | null;
}): ClientPortalPasswordState {
  if (!client.portalEnabled || !client.portalPasswordHash) return "none";
  return client.portalPasswordCiphertext ? "revealable" : "legacy";
}
