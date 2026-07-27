export type RasterImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export function detectImageMime(bytes: Uint8Array): RasterImageMime | null {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6))?.match(/^GIF8[79]a$/)) return "image/gif";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function validatePasswordChange(currentPassword: string, newPassword: string, confirmation = newPassword) {
  if (currentPassword.length === 0) return { ok: false as const, error: "Password sekarang wajib diisi." };
  if (newPassword.length < 8) return { ok: false as const, error: "Password baru minimal 8 karakter." };
  if (newPassword !== confirmation) return { ok: false as const, error: "Konfirmasi password tidak cocok." };
  if (currentPassword === newPassword) return { ok: false as const, error: "Password baru harus berbeda." };
  return { ok: true as const, currentPassword, newPassword };
}
