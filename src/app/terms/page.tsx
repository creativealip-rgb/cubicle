import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat & Ketentuan penggunaan layanan Cubiqlo — hub operasional klien untuk freelancer, agency, dan studio.",
};

const LAST_UPDATED = "14 Juli 2026";

export default function TermsPage() {
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
          Syarat &amp; Ketentuan
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Terakhir diperbarui: {LAST_UPDATED}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="space-y-3">
            <p>
              Selamat datang di Cubiqlo. Dengan membuat akun atau menggunakan
              layanan Cubiqlo (&ldquo;Layanan&rdquo;), kamu setuju terikat pada
              Syarat &amp; Ketentuan ini. Kalau kamu tidak setuju, mohon tidak
              menggunakan Layanan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              1. Tentang Layanan
            </h2>
            <p>
              Cubiqlo adalah platform operasional klien (client operations hub)
              untuk freelancer, agency, dan studio: mengelola klien, proyek,
              tugas, file, pelacakan waktu, invoice, booking, dan portal klien
              dalam satu tempat.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              2. Akun &amp; Keamanan
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Kamu bertanggung jawab menjaga kerahasiaan kredensial akun dan
                seluruh aktivitas yang terjadi di bawah akunmu.
              </li>
              <li>
                Kamu wajib memberikan informasi yang akurat saat mendaftar dan
                memperbaruinya bila berubah.
              </li>
              <li>
                Segera beri tahu kami jika ada penggunaan akun tanpa izin atau
                dugaan pelanggaran keamanan.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              3. Penggunaan yang Dapat Diterima
            </h2>
            <p>Kamu setuju untuk tidak:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Menggunakan Layanan untuk aktivitas melanggar hukum.</li>
              <li>
                Mengunggah konten yang melanggar hak pihak lain atau bersifat
                berbahaya, menyesatkan, atau melanggar hukum.
              </li>
              <li>
                Mencoba mengakses sistem tanpa izin, mengganggu, atau merusak
                integritas serta performa Layanan.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              4. Konten &amp; Data Kamu
            </h2>
            <p>
              Kamu tetap memiliki seluruh data yang kamu masukkan ke Cubiqlo
              (data klien, proyek, file, invoice, dan lainnya). Kamu memberi
              kami izin terbatas untuk memproses data tersebut semata-mata untuk
              menjalankan Layanan. Kami tidak menjual datamu.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              5. Pembayaran &amp; Langganan
            </h2>
            <p>
              Sebagian fitur tersedia gratis; fitur lain memerlukan langganan
              berbayar. Harga, batas paket, dan siklus penagihan ditampilkan di
              halaman langganan. Pembayaran yang sudah diproses umumnya tidak
              dapat dikembalikan kecuali diwajibkan oleh hukum yang berlaku.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              6. Penghentian
            </h2>
            <p>
              Kamu dapat berhenti menggunakan Layanan dan menghapus akun kapan
              saja. Kami dapat menangguhkan atau menghentikan akses jika terjadi
              pelanggaran terhadap Syarat ini, dengan pemberitahuan yang wajar
              bila memungkinkan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              7. Penafian &amp; Batasan Tanggung Jawab
            </h2>
            <p>
              Layanan disediakan &ldquo;sebagaimana adanya&rdquo; tanpa jaminan
              apa pun. Sejauh diizinkan hukum, Cubiqlo tidak bertanggung jawab
              atas kerugian tidak langsung, insidental, atau konsekuensial yang
              timbul dari penggunaan Layanan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              8. Perubahan
            </h2>
            <p>
              Kami dapat memperbarui Syarat ini dari waktu ke waktu. Perubahan
              material akan diberitahukan melalui Layanan atau email. Dengan
              tetap menggunakan Layanan setelah perubahan berlaku, kamu dianggap
              menyetujui Syarat yang diperbarui.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">9. Kontak</h2>
            <p>
              Pertanyaan tentang Syarat ini bisa dikirim ke{" "}
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
            nama badan hukum, yurisdiksi, dan ketentuan spesifik sesuai
            kebutuhan bisnis kamu sebelum digunakan secara resmi.
          </section>
        </div>

        <div className="mt-10 border-t pt-6 text-sm text-slate-500">
          <Link
            href="/privacy"
            className="font-medium text-[#6647F0] underline-offset-4 hover:underline"
          >
            Baca juga: Kebijakan Privasi
          </Link>
        </div>
      </article>
    </main>
  );
}
