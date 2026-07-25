export type PublicTokenErrorCode =
  | "invalid"
  | "disabled"
  | "revoked"
  | "expired"
  | "processed"
  | "unavailable";

export class PublicTokenError extends Error {
  constructor(public readonly code: PublicTokenErrorCode) {
    super(code);
    this.name = "PublicTokenError";
  }
}

type PublicTokenLifecycleInput = {
  presentedHash: string;
  storedHash: string | null | undefined;
  enabled?: boolean;
  revokedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  status?: string | null;
  allowedStatuses?: readonly string[];
  processedStatuses?: readonly string[];
  now?: Date;
};

export function assertPublicTokenLifecycle(input: PublicTokenLifecycleInput) {
  if (!input.storedHash || input.presentedHash !== input.storedHash) {
    throw new PublicTokenError("invalid");
  }
  if (input.enabled === false) throw new PublicTokenError("disabled");
  if (input.revokedAt) throw new PublicTokenError("revoked");

  const now = input.now ?? new Date();
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= now.getTime()) {
    throw new PublicTokenError("expired");
  }
  if (input.status && input.processedStatuses?.includes(input.status)) {
    throw new PublicTokenError("processed");
  }
  if (
    input.status &&
    input.allowedStatuses &&
    !input.allowedStatuses.includes(input.status)
  ) {
    throw new PublicTokenError("unavailable");
  }

  return { ok: true as const };
}
