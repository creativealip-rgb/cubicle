import { OTP_EXPIRY_MS } from "./crypto";

export type LoginState =
  | { status: "password_pending"; userId: string }
  | { status: "otp_pending"; userId: string; expiresAt: string }
  | { status: "authenticated"; userId: string };

export type LoginEvent =
  | { type: "password_verified"; trusted: boolean; twoFactorEnabled?: boolean }
  | { type: "otp_verified" };

export function advanceLogin(
  state: LoginState,
  event: LoginEvent,
  now: Date,
): LoginState {
  if (
    state.status === "password_pending" &&
    event.type === "password_verified"
  ) {
    return event.trusted
      ? { status: "authenticated", userId: state.userId }
      : {
          status: "otp_pending",
          userId: state.userId,
          expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS).toISOString(),
        };
  }
  if (state.status === "otp_pending" && event.type === "otp_verified") {
    return now < new Date(state.expiresAt)
      ? { status: "authenticated", userId: state.userId }
      : { status: "password_pending", userId: state.userId };
  }
  return state;
}
