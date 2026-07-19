export default function ClientGcalResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; clientId?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-12">
      <ClientGcalMessage searchParams={searchParams} />
    </main>
  );
}

async function ClientGcalMessage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; clientId?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "unknown";
  const error = params.error || "";

  const title =
    status === "connected"
      ? "Google Calendar terhubung"
      : status === "denied"
        ? "Akses Google ditolak"
        : status === "missing_config"
          ? "Integrasi belum siap"
          : status === "invalid"
            ? "Link tidak valid"
            : "Gagal menghubungkan";

  const body =
    status === "connected"
      ? "Terima kasih. Kalender Google klien sudah terhubung ke Cubiqlo. Kamu bisa tutup halaman ini."
      : status === "denied"
        ? "Izin Google dibatalkan. Minta ulang link undangan ke asisten/VA kamu."
        : status === "missing_config"
          ? "Server Cubiqlo belum dikonfigurasi untuk Google Calendar."
          : status === "invalid"
            ? "Link undangan tidak valid atau sudah dipakai."
            : error || "Terjadi kesalahan saat menghubungkan Google Calendar.";

  const tone =
    status === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={`rounded-xl border p-6 shadow-sm ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Cubiqlo</p>
      <h1 className="mt-2 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed opacity-90">{body}</p>
    </div>
  );
}
