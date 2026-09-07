export type PasskeyErrorCode = "cancelled" | "unsupported" | "failed";
export function getPasskeyErrorCode(error: unknown): PasskeyErrorCode {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (
    message.includes("not supported") ||
    message.includes("publickeycredential")
  )
    return "unsupported";
  if (
    message.includes("timed out") ||
    message.includes("not allowed") ||
    message.includes("notallowederror") ||
    message.includes("cancel")
  )
    return "cancelled";
  return "failed";
}
