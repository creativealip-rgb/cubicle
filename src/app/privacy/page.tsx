import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan Privasi Cubiqlo — bagaimana kami mengumpulkan, menggunakan, dan melindungi data kamu.",
};

const LAST_UPDATED = "14 Juli 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-header.png"
              alt="Cubiqlo"
              width={140}
              height={48}
              className="h-8 w-auto object-contain"
            />
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1 text-sm text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali daftar
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Kebijakan Privasi
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Terakhir diperbarui: {LAST_UPDATED}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="space-y-3">
            <p>
              Kebijakan ini menjelaskan bagaimana Cubiqlo mengumpulkan,
              menggunakan, dan melindungi informasi kamu saat menggunakan
              layanan kami. Kami berkomitmen menjaga data kamu tetap aman dan
              hanya digunakan untuk menjalankan Layanan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              1. Data yang Kami Kumpulkan
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Data akun:</strong> nama, email, dan password (disimpan
                dalam bentuk ter-hash, bukan teks biasa).
              </li>
              <li>
                <strong>Data workspace:</strong> informasi klien, proyek, tugas,
                file, invoice, dan konten lain yang kamu masukkan.
              </li>
              <li>
                <strong>Data teknis:</strong> log penggunaan, alamat IP, dan
                jenis perangkat/browser untuk keamanan dan diagnosa.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              2. Cara Kami Menggunakan Data
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Menyediakan, memelihara, dan meningkatkan Layanan.</li>
              <li>
                Memproses pembayaran dan mengelola langganan (lewat penyedia
                pembayaran pihak ketiga).
              </li>
              <li>
                Mengirim notifikasi penting terkait akun, keamanan, dan
                pembaruan Layanan.
              </li>
              <li>Mendeteksi, mencegah, dan menangani penyalahgunaan.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              3. Berbagi Data dengan Pihak Ketiga
            </h2>
            <p>
              Kami tidak menjual data pribadi kamu. Kami hanya membagikan data
              seperlunya kepada penyedia layanan yang membantu menjalankan
              Cubiqlo — misalnya penyedia hosting, pengiriman email, dan gerbang
              pembayaran — yang wajib menjaga kerahasiaan data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              4. Penyimpanan &amp; Keamanan
            </h2>
            <p>
              Data disimpan di infrastruktur yang kami kelola dengan kontrol
              akses dan enkripsi transport (HTTPS). Meski kami menerapkan langkah
              perlindungan yang wajar, tidak ada sistem yang 100% aman. Kami
              menyimpan data selama akun aktif atau sepanjang diperlukan untuk
              menjalankan Layanan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              5. Hak Kamu
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Mengakses dan memperbarui data akun kamu.</li>
              <li>Meminta ekspor atau penghapusan data.</li>
              <li>Menghapus akun kapan saja.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              6. Cookie
            </h2>
            <p>
              Kami menggunakan cookie yang diperlukan untuk sesi login dan
              preferensi (misalnya pilihan bahasa). Cookie ini penting agar
              Layanan berfungsi dan tidak digunakan untuk iklan pihak ketiga.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              7. Perubahan Kebijakan
            </h2>
            <p>
              Kami dapat memperbarui Kebijakan ini sewaktu-waktu. Perubahan
              material akan diberitahukan melalui Layanan atau email.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">8. Kontak</h2>
            <p>
              Untuk pertanyaan seputar privasi atau permintaan terkait data,
              hubungi{" "}
              <a
                href="mailto:support@cubiqlo.com"
                className="font-medium text-[#6647F0] underline-offset-4 hover:underline"
              >
                support@cubiqlo.com
              </a>
              .
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Dokumen ini adalah template umum dan bukan nasihat hukum. Sesuaikan
            dengan praktik pemrosesan data aktual, penyedia pihak ketiga yang
            kamu pakai, serta peraturan yang berlaku (mis. UU PDP) sebelum
            digunakan secara resmi.
          </section>
        </div>

        <div className="mt-10 border-t pt-6 text-sm text-slate-500">
          <Link
            href="/terms"
            className="font-medium text-[#6647F0] underline-offset-4 hover:underline"
          >
            Baca juga: Syarat &amp; Ketentuan
          </Link>
        </div>
      </article>
    </main>
  );
}
