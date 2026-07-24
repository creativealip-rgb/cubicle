import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { workspaces, workspaceMembers, users, workspaceCurrencyRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, Users, Receipt, Calendar, Sparkles, ImageIcon, Plug, Coins, CheckCircle2, Circle } from "lucide-react";
import { TeamManager } from "@/components/settings/team-manager";
import { WorkspaceBrandingForm } from "@/components/settings/workspace-branding-form";
import { WorkspaceNameForm } from "@/components/settings/workspace-name-form";
import { BookingSlugForm } from "@/components/settings/booking-slug-form";
import { GoogleCalendarConnect } from "@/components/settings/google-calendar-connect";
import { CurrencyRatesForm } from "@/components/settings/currency-rates-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { getCurrentLang, createT } from "@/lib/i18n";
import { canInviteMember } from "@/lib/plan";
import {
  getGoogleConnectionStatus,
  getGoogleRedirectUri,
} from "@/lib/google-calendar";
import { Suspense } from "react";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const currentMember = await assertWorkspaceMember(db, user.id, workspaceId);
  const canManageTeam = currentMember.role === "owner";
  const canEditWorkspace = currentMember.role === "owner";

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const [currentUser] = await db
    .select({ name: users.name, email: users.email, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const members = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(workspaceMembers)
    .leftJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId)))
    .orderBy(workspaceMembers.role);

  const inviteGate = await canInviteMember(user.id);
  const googleStatus = await getGoogleConnectionStatus(user.id);

  const currencyRateRows = await db
    .select({
      id: workspaceCurrencyRates.id,
      fromCurrency: workspaceCurrencyRates.fromCurrency,
      rate: workspaceCurrencyRates.rate,
    })
    .from(workspaceCurrencyRates)
    .where(eq(workspaceCurrencyRates.workspaceId, workspaceId))
    .orderBy(workspaceCurrencyRates.fromCurrency);

  const [ownerUser] = workspace?.ownerId
    ? await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, workspace.ownerId))
        .limit(1)
    : [null];

  const workspaceSetupItems = [
    {
      label: t("Nama bisnis / workspace", "Business / workspace name"),
      done: Boolean(workspace.billingName || workspace.name),
    },
    {
      label: t("Email bisnis untuk invoice", "Business email for invoices"),
      done: Boolean(workspace.billingEmail || workspace.replyToEmail),
    },
    {
      label: t("Alamat atau telepon bisnis", "Business address or phone"),
      done: Boolean(workspace.billingAddress || workspace.billingPhone),
    },
    {
      label: t("Booking slug / link booking", "Booking slug / booking link"),
      done: Boolean(workspace.bookingSlug),
    },
  ];
  const invoiceSetupItems = [
    {
      label: t("Mata uang default", "Default currency"),
      done: Boolean(workspace.defaultCurrency),
    },
    {
      label: t("Pajak atau rate default", "Tax or default rate"),
      done: Boolean(Number(workspace.defaultTaxRate) > 0 || workspace.defaultHourlyRate),
    },
    {
      label: t("Terms pembayaran", "Payment terms"),
      done: Boolean(workspace.defaultInvoiceTerms),
    },
    {
      label: t("Email balasan invoice", "Invoice reply-to email"),
      done: Boolean(workspace.replyToEmail),
    },
  ];
  const workspaceSetupDone = workspaceSetupItems.filter((item) => item.done).length;
  const invoiceSetupDone = invoiceSetupItems.filter((item) => item.done).length;

  const sp = searchParams ? await searchParams : undefined;
  const rawTab = sp?.tab;
  const initialTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title">{t("Pengaturan", "Settings")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "Kelompokkan konfigurasi workspace per tab biar gampang dicari.",
            "Group workspace settings into tabs so they stay easy to find.",
          )}
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <SettingsTabs
          initialTab={initialTab}
          workspace={
            <>
              {workspaceSetupDone < workspaceSetupItems.length && (
                <Card className="border-blue-200 bg-blue-50/70">
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-950">
                        {t("Lengkapi profil workspace", "Complete workspace profile")}
                      </p>
                      <p className="mt-1 text-sm text-blue-900/70">
                        {t(
                          "Data ini dipakai di invoice, portal client, booking, dan email agar terlihat profesional.",
                          "This data is used on invoices, client portal, booking, and emails so everything looks professional.",
                        )}
                      </p>
                    </div>
                    <Badge className="w-fit bg-blue-600 text-white hover:bg-blue-600">
                      {workspaceSetupDone}/{workspaceSetupItems.length} {t("selesai", "done")}
                    </Badge>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Workspace
                  </CardTitle>
                  <CardDescription>
                    {t("Info workspace utama", "Main workspace info")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <WorkspaceNameForm defaultName={workspace.name} canEdit={canEditWorkspace} />
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slug</span>
                      <Badge variant="secondary">{workspace.slug}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("Mata Uang", "Currency")}</span>
                      <span>{workspace.defaultCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("Pajak", "Tax")}</span>
                      <span>{workspace.defaultTaxRate}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t(
                        "Ubah mata uang / pajak default di tab Branding & Invoice.",
                        "Change default currency / tax in Branding & Invoice tab.",
                      )}
                    </p>
                  </div>
                  <BookingSlugForm defaultSlug={workspace.bookingSlug} canEdit={canEditWorkspace} />
                  <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                    {workspaceSetupItems.map((item) => {
                      const Icon = item.done ? CheckCircle2 : Circle;
                      return (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <Icon className={item.done ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-muted-foreground"} />
                          <span className={item.done ? "text-slate-700" : "text-muted-foreground"}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5" /> {t("Kurs finance", "Finance FX rates")}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      "Konversi multi-currency ke base currency untuk ringkasan dashboard, laporan, dan KPI pengeluaran (manual rate).",
                      "Convert multi-currency totals into base currency for dashboard, reports, and expense KPIs (manual rates).",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CurrencyRatesForm
                    baseCurrency={workspace.defaultCurrency || "IDR"}
                    rates={currencyRateRows.map((r) => ({
                      id: r.id,
                      fromCurrency: r.fromCurrency,
                      rate: Number(r.rate),
                    }))}
                    canEdit={canEditWorkspace}
                    showBaseCurrencyApprox={workspace.showBaseCurrencyApprox !== false}
                  />
                </CardContent>
              </Card>
            </>
          }
          account={
            <Card>
              <CardHeader>
                <CardTitle>{t("Akun", "Account")}</CardTitle>
                <CardDescription>
                  {t(
                    "Ubah nama tampilan dan password akun. Email login tampil sebagai referensi.",
                    "Update display name and account password. Login email is shown for reference.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccountSettingsForm
                  name={currentUser?.name ?? ""}
                  email={currentUser?.email ?? user.email ?? ""}
                  emailVerified={Boolean(currentUser?.emailVerified)}
                />
              </CardContent>
            </Card>
          }
          team={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> {t("Tim", "Team")}
                </CardTitle>
                <CardDescription>
                  {canManageTeam
                    ? t(
                        "Tambah user, ubah role, atau hapus anggota.",
                        "Add users, change roles, or remove members.",
                      )
                    : t("Lihat anggota tim workspace.", "View workspace team members.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManageTeam ? (
                  <TeamManager
                    members={members}
                    canInvite={inviteGate.allowed}
                    inviteBlockedReason={inviteGate.reason}
                  />
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{member.name || member.email}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant="secondary">{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          }
          branding={
            <>
              {invoiceSetupDone < invoiceSetupItems.length && (
                <Card className="border-amber-200 bg-amber-50/70">
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-950">
                        {t("Atur invoice sebelum kirim ke client", "Set invoice defaults before sending to clients")}
                      </p>
                      <p className="mt-1 text-sm text-amber-900/70">
                        {t(
                          "Mata uang, terms pembayaran, pajak/rate, dan email invoice bikin tagihan lebih siap pakai.",
                          "Currency, payment terms, tax/rate, and invoice email make billing ready to use.",
                        )}
                      </p>
                    </div>
                    <Badge className="w-fit bg-amber-600 text-white hover:bg-amber-600">
                      {invoiceSetupDone}/{invoiceSetupItems.length} {t("selesai", "done")}
                    </Badge>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" /> {t("Branding & Invoice", "Branding & Invoice")}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      "Logo, nama tagihan, mata uang, tarif default — dipakai di PDF + preview klien.",
                      "Logo, billing name, currency, default rate — used on PDF + client preview.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                    {invoiceSetupItems.map((item) => {
                      const Icon = item.done ? CheckCircle2 : Circle;
                      return (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <Icon className={item.done ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-muted-foreground"} />
                          <span className={item.done ? "text-slate-700" : "text-muted-foreground"}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <WorkspaceBrandingForm
                    defaults={{
                      billingName: workspace.billingName,
                      billingEmail: workspace.billingEmail,
                      billingPhone: workspace.billingPhone,
                      billingAddress: workspace.billingAddress,
                      taxId: workspace.taxId,
                      logoUrl: workspace.logoUrl,
                      defaultCurrency: workspace.defaultCurrency,
                      defaultTaxRate: workspace.defaultTaxRate,
                      defaultHourlyRate: workspace.defaultHourlyRate,
                      defaultInvoiceTerms: workspace.defaultInvoiceTerms,

                      replyToEmail: workspace.replyToEmail,
                    }}
                    ownerEmailHint={ownerUser?.email ?? null}
                  />
                </CardContent>
              </Card>
            </>
          }
          integrations={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Google Calendar
                </CardTitle>
                <CardDescription>
                  {t(
                    "Hubungkan Google Calendar biar booking otomatis masuk event.",
                    "Connect Google Calendar so bookings auto-create events.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleCalendarConnect
                  configured={googleStatus.configured}
                  connected={googleStatus.connected}
                  email={googleStatus.connection?.googleAccountEmail ?? null}
                  status={googleStatus.connection?.status ?? null}
                  lastError={googleStatus.connection?.lastError ?? null}
                  redirectUri={getGoogleRedirectUri()}
                />
              </CardContent>
            </Card>
          }
          more={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" /> {t("Akses Cepat", "Quick Access")}
                </CardTitle>
                <CardDescription>
                  {t("Pintasan ke pengaturan lain.", "Shortcuts to other settings.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <Button asChild variant="outline" className="justify-start gap-2">
                  <Link href="/app/billing">
                    <Receipt className="h-4 w-4" /> {t("Langganan & Tagihan", "Subscription & Billing")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start gap-2">
                  <Link href="/app/calendar">
                    <Calendar className="h-4 w-4" /> {t("Booking & Kalender", "Booking & Calendar")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start gap-2">
                  <Link href="/app/billing">
                    <Sparkles className="h-4 w-4" /> {t("Penggunaan AI", "AI Usage")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          }
        />
      </Suspense>
    </div>
  );
}
