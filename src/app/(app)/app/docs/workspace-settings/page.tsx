import { getCurrentLang, createT } from "@/lib/i18n";
import Link from "next/link";

export default async function DocWorkspaceSettings() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="min-w-0 space-y-8 max-w-3xl">
      <div>
        <Link href="/app/docs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          ← {t("Dokumentasi", "Documentation")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">
          {t("Panduan Pengaturan & Setup Workspace", "Workspace Setup & Settings Guide")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "Konfigurasi identitas bisnis, logo penagihan, email balasan kustom, manajemen tim, dan paket langganan.",
            "Configure business identity, billing logo, custom Reply-To email, team management, and subscription plans."
          )}
        </p>
      </div>

      <div className="space-y-6 text-sm text-muted-foreground">
        {/* Section 1 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("1. Profil Bisnis & Alamat Penagihan", "1. Business Profile & Billing Address")}
          </h2>
          <p>
            {t(
              "Fungsi: Menentukan nama resmi workspace, alamat operasional, dan mata uang default yang akan tercetak otomatis pada berkas Invoice dan Portal Klien.",
              "Function: Set official workspace name, operational address, and default currency printed on Invoices and Client Portals."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Langkah Setup:", "Setup Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka menu Pengaturan (/app/settings).", "Open Settings menu (/app/settings).")}</li>
              <li>{t("Di tab Workspace, isi Nama Workspace, Nama Perusahaan/Entitas Bisnis, dan Alamat Lengkap.", "On Workspace tab, fill Workspace Name, Entity Name, and Full Address.")}</li>
              <li>{t("Tentukan Mata Uang Default (IDR / USD / SGD / EUR).", "Select Default Currency (IDR / USD / SGD / EUR).")}</li>
              <li>{t("Klik 'Simpan Perubahan'.", "Click 'Save Changes'.")}</li>
            </ol>
          </div>
        </section>

        {/* Section 2 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("2. Logo & Reply-To Email Branding", "2. Logo & Reply-To Email Branding")}
          </h2>
          <p>
            {t(
              "Fungsi: Memastikan dokumen invoice PDF, halaman portal, dan notifikasi email membawa identitas visual agensi kamu.",
              "Function: Ensure PDF invoices, portal pages, and email notifications carry your agency visual identity."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Langkah Setup:", "Setup Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka Pengaturan → tab 'Branding & Invoice'.", "Open Settings → 'Branding & Invoice' tab.")}</li>
              <li>{t("Unggah Logo Workspace (format PNG/JPG, rekomendasi rasio persegi/transparan).", "Upload Workspace Logo (PNG/JPG, transparent recommended).")}</li>
              <li>{t("Isi kolom 'Reply-To Email' dengan email resmi agensimu.", "Fill 'Reply-To Email' field with your official agency email.")}</li>
              <li>{t("Semua email otomatis (notifikasi portal/invoice) akan mengarahkan balasan klien ke email Reply-To tersebut.", "All automated emails (portal/invoice notifications) will route client replies to this Reply-To address.")}</li>
              <li>{t("Atur Catatan & Syarat Penagihan Default (Invoice Terms) untuk dimasukkan otomatis pada setiap invoice baru.", "Set Default Invoice Terms automatically populated on new invoices.")}</li>
            </ol>
          </div>
        </section>

        {/* Section 3 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("3. Manajemen Anggota Tim & Peran (Role)", "3. Team Member Management & Roles")}
          </h2>
          <p>
            {t(
              "Fungsi: Mengundang rekan kerja atau staf untuk berkolaborasi dengan pembatasan hak akses yang aman.",
              "Function: Invite teammates or staff to collaborate with safe role-based permissions."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Langkah Setup (Owner Only):", "Setup Steps (Owner Only):")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka Pengaturan → tab 'Tim'.", "Open Settings → 'Team' tab.")}</li>
              <li>{t("Klik 'Undang Anggota'.", "Click 'Invite Member'.")}</li>
              <li>{t("Masukan alamat email anggota dan pilih Peran (Member atau Viewer).", "Enter member email address and select Role (Member or Viewer).")}</li>
              <li>{t("Member: Dapat menambah/mengedit data operasional klien & proyek.", "Member: Can add/edit client & project operational data.")}</li>
              <li>{t("Viewer: Hanya dapat melihat data tanpa hak akses edit/hapus.", "Viewer: Read-only access without edit/delete permissions.")}</li>
              <li>{t("Klik 'Kirim Undangan'. Anggota dapat langsung masuk menggunakan email tersebut.", "Click 'Send Invitation'. Member can sign in using that email.")}</li>
            </ol>
          </div>
        </section>

        {/* Section 4 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("4. Upgrade Paket Langganan Workspace", "4. Subscription Plan Upgrade")}
          </h2>
          <p>
            {t(
              "Fungsi: Meng-upgrade batas jumlah klien dan anggota tim workspace secara instan via pembayaran tahunan.",
              "Function: Instantly upgrade client limits and team seat capacities via annual payments."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Langkah Upgrade:", "Upgrade Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka menu Billing (/app/billing).", "Open Billing menu (/app/billing).")}</li>
              <li>{t("Pilih paket langganan: Solo (Rp 588rb/tahun) atau Team (Rp 1,188jt/tahun).", "Choose plan: Solo (Rp 588k/yr) or Team (Rp 1.188m/yr).")}</li>
              <li>{t("Klik 'Pilih Paket'. Sistem akan mengarahkan ke halaman pembayaran resmi.", "Click 'Select Plan'. The system redirects to official payment page.")}</li>
              <li>{t("Selesaikan proses pembayaran e-wallet atau m-banking.", "Complete payment via e-wallet or mobile banking.")}</li>
              <li>{t("Setelah pembayaran berhasil, paket workspace otomatis aktif dalam hitungan detik.", "Upon successful payment, workspace plan upgrades instantly in seconds.")}</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
