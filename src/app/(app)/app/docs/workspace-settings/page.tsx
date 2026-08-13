import { getCurrentLang, createT } from "@/lib/i18n";
import { getPlanYearlyLabel } from "@/lib/billing-pricing";
import { BILLING_PLANS } from "@/lib/billing-plans";
import { Building2, Image, Users, CreditCard } from "lucide-react";
import {
  DocsBreadcrumb,
  DocsHero,
  DocsLayout,
  DocsSection,
  DocsSteps,
} from "@/components/docs/doc-shell";

export default async function DocWorkspaceSettings() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  const toc = [
    { id: "profil-bisnis", label: t("1. Profil Bisnis & Alamat Penagihan", "1. Business Profile & Billing Address") },
    { id: "branding", label: t("2. Logo & Reply-To Email Branding", "2. Logo & Reply-To Email Branding") },
    { id: "tim", label: t("3. Manajemen Anggota Tim & Peran (Role)", "3. Team Member Management & Roles") },
    { id: "langganan", label: t("4. Upgrade Paket Langganan Workspace", "4. Subscription Plan Upgrade") },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <DocsBreadcrumb
        items={[
          { label: t("Dokumentasi", "Documentation"), href: "/app/docs" },
          { label: t("Panduan Pengaturan & Setup Workspace", "Workspace Setup & Settings Guide") },
        ]}
      />
      <DocsHero
        icon={Building2}
        category={t("Pengaturan", "Settings")}
        title={t("Panduan Pengaturan & Setup Workspace", "Workspace Setup & Settings Guide")}
        description={t(
          "Konfigurasi identitas bisnis, logo penagihan, email balasan kustom, manajemen tim, dan paket langganan.",
          "Configure business identity, billing logo, custom Reply-To email, team management, and subscription plans."
        )}
        readMinutes={5}
      />
      <DocsLayout toc={toc} tocLabel={t("Daftar Isi", "Table of Contents")}>
        <DocsSection
          id="profil-bisnis"
          step={1}
          icon={Building2}
          title={t("Profil Bisnis & Alamat Penagihan", "Business Profile & Billing Address")}
        >
          <p>
            {t(
              "Fungsi: Menentukan nama resmi workspace, alamat operasional, dan mata uang default yang akan tercetak otomatis pada berkas Invoice dan Portal Klien.",
              "Function: Set official workspace name, operational address, and default currency printed on Invoices and Client Portals."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Langkah Setup:", "Setup Steps:")}</p>
            <DocsSteps
              items={[
                t("Buka menu Pengaturan (/app/settings).", "Open Settings menu (/app/settings)."),
                t(
                  "Di tab Workspace, isi Nama Workspace, Nama Perusahaan/Entitas Bisnis, dan Alamat Lengkap.",
                  "On Workspace tab, fill Workspace Name, Entity Name, and Full Address."
                ),
                t("Tentukan Mata Uang Default (IDR / USD / SGD / EUR).", "Select Default Currency (IDR / USD / SGD / EUR)."),
                t("Klik 'Simpan Perubahan'.", "Click 'Save Changes'."),
              ]}
            />
          </div>
        </DocsSection>

        <DocsSection
          id="branding"
          step={2}
          icon={Image}
          title={t("Logo & Reply-To Email Branding", "Logo & Reply-To Email Branding")}
        >
          <p>
            {t(
              "Fungsi: Memastikan dokumen invoice PDF, halaman portal, dan notifikasi email membawa identitas visual agensi kamu.",
              "Function: Ensure PDF invoices, portal pages, and email notifications carry your agency visual identity."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Langkah Setup:", "Setup Steps:")}</p>
            <DocsSteps
              items={[
                t("Buka Pengaturan → tab 'Branding & Invoice'.", "Open Settings → 'Branding & Invoice' tab."),
                t(
                  "Unggah Logo Workspace (format PNG/JPG, rekomendasi rasio persegi/transparan).",
                  "Upload Workspace Logo (PNG/JPG, transparent recommended)."
                ),
                t(
                  "Isi kolom 'Reply-To Email' dengan email resmi agensimu.",
                  "Fill 'Reply-To Email' field with your official agency email."
                ),
                t(
                  "Semua email otomatis (notifikasi portal/invoice) akan mengarahkan balasan klien ke email Reply-To tersebut.",
                  "All automated emails (portal/invoice notifications) will route client replies to this Reply-To address."
                ),
                t(
                  "Atur Catatan & Syarat Penagihan Default (Invoice Terms) untuk dimasukkan otomatis pada setiap invoice baru.",
                  "Set Default Invoice Terms automatically populated on new invoices."
                ),
              ]}
            />
          </div>
        </DocsSection>

        <DocsSection
          id="tim"
          step={3}
          icon={Users}
          title={t("Manajemen Anggota Tim & Peran (Role)", "Team Member Management & Roles")}
        >
          <p>
            {t(
              "Fungsi: Mengundang rekan kerja atau staf untuk berkolaborasi dengan pembatasan hak akses yang aman.",
              "Function: Invite teammates or staff to collaborate with safe role-based permissions."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Langkah Setup (Owner Only):", "Setup Steps (Owner Only):")}</p>
            <DocsSteps
              items={[
                t("Buka Pengaturan → tab 'Tim'.", "Open Settings → 'Team' tab."),
                t("Klik 'Undang Anggota'.", "Click 'Invite Member'."),
                t(
                  "Masukan alamat email anggota dan pilih Peran (Member atau Viewer).",
                  "Enter member email address and select Role (Member or Viewer)."
                ),
                t(
                  "Member: Dapat menambah/mengedit data operasional klien & proyek.",
                  "Member: Can add/edit client & project operational data."
                ),
                t(
                  "Viewer: Hanya dapat melihat data tanpa hak akses edit/hapus.",
                  "Viewer: Read-only access without edit/delete permissions."
                ),
                t(
                  "Klik 'Kirim Undangan'. Anggota dapat langsung masuk menggunakan email tersebut.",
                  "Click 'Send Invitation'. Member can sign in using that email."
                ),
              ]}
            />
          </div>
        </DocsSection>

        <DocsSection
          id="langganan"
          step={4}
          icon={CreditCard}
          title={t("Upgrade Paket Langganan Workspace", "Subscription Plan Upgrade")}
        >
          <p>
            {t(
              "Fungsi: Meng-upgrade batas jumlah klien dan anggota tim workspace secara instan via pembayaran tahunan.",
              "Function: Instantly upgrade client limits and team seat capacities via annual payments."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Langkah Upgrade:", "Upgrade Steps:")}</p>
            <DocsSteps
              items={[
                t("Buka menu Billing (/app/billing).", "Open Billing menu (/app/billing)."),
                t(
                  `Pilih paket langganan: Solo (${getPlanYearlyLabel(BILLING_PLANS.solo)}/tahun) atau Team (${getPlanYearlyLabel(BILLING_PLANS.team)}/tahun).`,
                  `Choose plan: Solo (${getPlanYearlyLabel(BILLING_PLANS.solo)}/yr) or Team (${getPlanYearlyLabel(BILLING_PLANS.team)}/yr).`
                ),
                t(
                  "Klik 'Pilih Paket'. Sistem akan mengarahkan ke halaman pembayaran resmi.",
                  "Click 'Select Plan'. The system redirects to official payment page."
                ),
                t("Selesaikan proses pembayaran e-wallet atau m-banking.", "Complete payment via e-wallet or mobile banking."),
                t(
                  "Setelah pembayaran berhasil, paket workspace otomatis aktif dalam hitungan detik.",
                  "Upon successful payment, workspace plan upgrades instantly in seconds."
                ),
              ]}
            />
          </div>
        </DocsSection>
      </DocsLayout>
    </div>
  );
}
