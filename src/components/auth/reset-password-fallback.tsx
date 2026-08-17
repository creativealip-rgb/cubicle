"use client";

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

/**
 * Backward-compatible entry for `/reset-password?token=...` (query-param form).
 * The canonical link from Better Auth is `/reset-password/{token}` which is
 * handled by the `[token]` route; this fallback keeps any old query-based
 * links (and `/reset-password` without a token) working.
 */
export function ResetPasswordFallback() {
  const params = useSearchParams();
  const token = params.get("token") ?? undefined;
  const callbackURL = params.get("callbackURL") ?? undefined;
  return <ResetPasswordForm token={token} callbackURL={callbackURL} />;
}
