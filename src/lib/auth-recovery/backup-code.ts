export function consumeBackupCode(encoded: string, code: string) {
  try {
    const codes = JSON.parse(encoded);
    if (
      !Array.isArray(codes) ||
      !codes.every((v) => typeof v === "string") ||
      !codes.includes(code)
    )
      return { ok: false } as const;
    return {
      ok: true,
      encoded: JSON.stringify(codes.filter((v) => v !== code)),
    } as const;
  } catch {
    return { ok: false } as const;
  }
}
