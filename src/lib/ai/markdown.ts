export function normalizeAssistantMarkdown(text: string): string {
  return text
    .replace(/(^|\n)\*(?=[^*\s])/g, "$1* ")
    .replace(/([^\n])\s*\*\s+(?=\*{0,2}[A-Z0-9])/g, "$1\n* ")
    .replace(/(\d)(?=(?:terlambat|belum))/g, "$1 ")
    .replace(/(proyek|klien|tugas|invoice)(?=(aktif|belum|open|terbuka))/gi, "$1 ")
    .replace(/\)(?=senilai|total|sebesar)/gi, ") ");
}
