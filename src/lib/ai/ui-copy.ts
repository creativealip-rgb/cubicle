export type AssistantLang = "id" | "en";

export const assistantCopy = {
  id: {
    title: "Asisten Kerja", subtitle: "Tanya data workspace atau minta bantuan menyelesaikan pekerjaan.",
    greeting: "Apa yang ingin kamu cek hari ini?", placeholder: "Tulis pertanyaan atau perintah…", send: "Kirim", stop: "Berhenti",
    newChat: "Chat baru", history: "Riwayat", historyTitle: "Riwayat percakapan", noHistory: "Belum ada percakapan.",
    startHere: "Mulai dari sini", allHelp: "Lihat semua bantuan", close: "Tutup", delete: "Hapus", cancel: "Batalkan",
    deleteTitle: "Hapus percakapan?", deleteBody: "Percakapan ini akan dihapus permanen.",
    capabilityReadTitle: "Bisa membaca", capabilityRead: "Klien, proyek, tugas, invoice, keuangan, proposal, kontrak, dan questionnaire.",
    capabilityActTitle: "Bisa membantu melakukan", capabilityAct: "Ubah status tugas dan siapkan draft reminder invoice — selalu dengan konfirmasi.",
    hint: "Enter untuk kirim · Shift+Enter untuk baris baru", voice: "Input suara", stopVoice: "Berhenti mendengarkan",
    confirmIntro: "Periksa tindakan berikut sebelum konfirmasi.", actionDone: "Tindakan selesai", actionFailed: "Tindakan gagal. Tidak ada perubahan.",
    taskChange: "Perubahan yang akan dilakukan", task: "Tugas", currentStatus: "Status sekarang", newStatus: "Status baru", reason: "Alasan", confirmChange: "Konfirmasi perubahan",
    reminderDraft: "Draft reminder pembayaran", invoice: "Invoice", recipient: "Penerima", unavailable: "Belum tersedia", subject: "Subjek", body: "Isi", copyDraft: "Salin draft", confirmDraft: "Konfirmasi draft",
    genericError: "Koneksi AI sedang bermasalah. Data kamu tidak diubah.", stoppedError: "Jawaban berhenti sebelum selesai. Kirim ulang pertanyaan.", dataError: "Data workspace belum bisa diperiksa. Coba lagi.",
  },
  en: {
    title: "Work Assistant", subtitle: "Ask about workspace data or get help completing work.",
    greeting: "What would you like to check today?", placeholder: "Write a question or command…", send: "Send", stop: "Stop",
    newChat: "New chat", history: "History", historyTitle: "Conversation history", noHistory: "No conversations yet.",
    startHere: "Start here", allHelp: "View all help", close: "Close", delete: "Delete", cancel: "Cancel",
    deleteTitle: "Delete conversation?", deleteBody: "This conversation will be permanently deleted.",
    capabilityReadTitle: "Can read", capabilityRead: "Clients, projects, tasks, invoices, finance, proposals, contracts, and questionnaires.",
    capabilityActTitle: "Can help perform", capabilityAct: "Update task status and prepare invoice reminder drafts — always with confirmation.",
    hint: "Enter to send · Shift+Enter for new line", voice: "Voice input", stopVoice: "Stop listening",
    confirmIntro: "Review this action before confirming.", actionDone: "Action completed", actionFailed: "Action failed. Nothing changed.",
    taskChange: "Proposed change", task: "Task", currentStatus: "Current status", newStatus: "New status", reason: "Reason", confirmChange: "Confirm change",
    reminderDraft: "Payment reminder draft", invoice: "Invoice", recipient: "Recipient", unavailable: "Not available", subject: "Subject", body: "Body", copyDraft: "Copy draft", confirmDraft: "Confirm draft",
    genericError: "The AI connection is having trouble. Your data was not changed.", stoppedError: "The answer stopped before completion. Send the question again.", dataError: "Workspace data could not be checked. Try again.",
  },
} as const;

export function getAssistantCopy(lang: string) { return assistantCopy[lang === "en" ? "en" : "id"]; }

const toolGroups: Array<[RegExp, string, string]> = [
  [/thinking/i, "Menganalisis pertanyaan…", "Analyzing your question…"],
  [/client/i, "Mencari data klien…", "Looking up client data…"],
  [/project/i, "Mencari data proyek…", "Looking up project data…"],
  [/task/i, "Memeriksa tugas…", "Checking tasks…"],
  [/invoice|aging/i, "Memeriksa invoice…", "Checking invoices…"],
  [/expense|revenue|profit|loss|cash.flow|finance/i, "Menghitung data keuangan…", "Calculating financial data…"],
  [/search/i, "Mencari di workspace…", "Searching the workspace…"],
  [/proposal/i, "Memeriksa proposal…", "Checking proposals…"],
  [/contract/i, "Memeriksa kontrak…", "Checking contracts…"],
  [/questionnaire/i, "Memeriksa questionnaire…", "Checking questionnaires…"],
];
export function humanizeToolStatus(raw: string | undefined, lang: AssistantLang) {
  const value = raw || "thinking";
  const match = toolGroups.find(([pattern]) => pattern.test(value));
  return match ? match[lang === "en" ? 2 : 1] : lang === "en" ? "Checking workspace data…" : "Memeriksa data workspace…";
}
export function sanitizeAssistantError(raw: string | undefined, lang: AssistantLang) {
  if (/abort|stop/i.test(raw || "")) return getAssistantCopy(lang).stoppedError;
  return getAssistantCopy(lang).genericError;
}
export function formatAssistantRelativeTime(iso: string, lang: AssistantLang, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return lang === "en" ? "just now" : "baru saja";
  if (minutes < 60) return lang === "en" ? `${minutes} minute${minutes === 1 ? "" : "s"} ago` : `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "en" ? `${hours} hour${hours === 1 ? "" : "s"} ago` : `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === "en" ? `${days} day${days === 1 ? "" : "s"} ago` : `${days} hari lalu`;
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }).format(new Date(iso));
}
