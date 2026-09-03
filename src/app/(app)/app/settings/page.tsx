import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { accounts, passkeys, sessions, twoFactors, workspaces, workspaceMembers, users, workspaceCurrencyRates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Receipt, Calendar, CheckCircle2, Circle, Sliders } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TeamManager } from "@/components/settings/team-manager";
import { WorkspaceBrandingForm } from "@/components/settings/workspace-branding-form";
import { WorkspaceNameForm } from "@/components/settings/workspace-name-form";
import { GoogleCalendarConnect } from "@/components/settings/google-calendar-connect";
import { CurrencyRatesForm } from "@/components/settings/currency-rates-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { AccountSecuritySettings } from "@/components/settings/account-security-settings";
import { getCurrentLang, createT } from "@/lib/i18n";
import { canInviteMember } from "@/lib/plan";
import {
  getGoogleConnectionStatus,
  getGoogleRedirectUri,
} from "@/lib/google-calendar";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import BillingPage from "@/app/(app)/app/billing/page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Kelola pengaturan workspace, akun, tim, dan integrasi Cubiqlo.",
};

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
    .select({ name: users.name, email: users.email, emailVerified: users.emailVerified, twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const [credentialPassword, passkeyRows, twoFactorRows, sessionRows] = await Promise.all([
    db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential"))).limit(1),
    db.select({ id: passkeys.id, name: passkeys.name, deviceType: passkeys.deviceType, createdAt: passkeys.createdAt }).from(passkeys).where(eq(passkeys.userId, user.id)).orderBy(passkeys.createdAt),
    db.select({ id: twoFactors.id }).from(twoFactors).where(eq(twoFactors.userId, user.id)).limit(1),
    db.select({ id: sessions.id, updatedAt: sessions.updatedAt, ipAddress: sessions.ipAddress, userAgent: sessions.userAgent }).from(sessions).where(eq(sessions.userId, user.id)).orderBy(desc(sessions.updatedAt)).limit(5),
  ]);

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
      <PageHeader
        icon={Sliders}
        title={t("Pengaturan", "Settings")}
        description={t(
          "Kelompokkan konfigurasi workspace, profil akun, keamanan 2FA, tim, dan integrasi.",
          "Group workspace settings, account profile, 2FA security, team members, and integrations.",
        )}
      />

      <Suspense fallback={<div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>}>
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
                    {t(
                      "Profil workspace dan branding bisnis kamu.",
                      "Your workspace profile and business branding.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <WorkspaceNameForm defaultName={workspace.name} canEdit={canEditWorkspace} />
                  <div className="border-t pt-3">
                    <h3 className="mb-3 text-sm font-semibold">{t("Profil workspace & Branding", "Workspace profile & Branding")}</h3>
                    <WorkspaceBrandingForm section="workspace" canEdit={canEditWorkspace} defaults={{ billingName: workspace.billingName, billingEmail: workspace.billingEmail, billingPhone: workspace.billingPhone, billingAddress: workspace.billingAddress, taxId: workspace.taxId, logoUrl: workspace.logoUrl, defaultCurrency: workspace.defaultCurrency, defaultTaxRate: workspace.defaultTaxRate, defaultHourlyRate: workspace.defaultHourlyRate, defaultInvoiceTerms: workspace.defaultInvoiceTerms, replyToEmail: workspace.replyToEmail }} />
                  </div>

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

            </>
          }
          account={
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("Akun", "Account")}</CardTitle>
                    <CardDescription>
                      {t(
                        "Ubah nama tampilan dan password akun.",
                        "Update display name and account password.",
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
              </div>

              <div className="space-y-4">
                <AccountSecuritySettings
                  twoFactorEnabled={Boolean(currentUser?.twoFactorEnabled)}
                  hasAuthenticator={twoFactorRows.length > 0}
                  hasCredentialPassword={credentialPassword.length > 0}
                  passkeys={passkeyRows}
                  sessions={sessionRows}
                />
              </div>
            </div>
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
                        "Kelola anggota, peran, dan undangan workspace.",
                        "Manage members, roles, and workspace invitations.",
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
          invoice={
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
                    <Receipt className="h-5 w-5" /> {t("Default Invoice", "Invoice Defaults")}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      "Mata uang, terms pembayaran, pajak/rate, dan email invoice bikin tagihan lebih siap pakai.",
                      "Currency, payment terms, tax/rate, and invoice email make billing ready to use.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WorkspaceBrandingForm section="invoice" canEdit={canEditWorkspace} defaults={{ billingName: workspace.billingName, billingEmail: workspace.billingEmail, billingPhone: workspace.billingPhone, billingAddress: workspace.billingAddress, taxId: workspace.taxId, logoUrl: workspace.logoUrl, defaultCurrency: workspace.defaultCurrency, defaultTaxRate: workspace.defaultTaxRate, defaultHourlyRate: workspace.defaultHourlyRate, defaultInvoiceTerms: workspace.defaultInvoiceTerms, replyToEmail: workspace.replyToEmail }} />
                  <CurrencyRatesForm baseCurrency={workspace.defaultCurrency || "IDR"} rates={currencyRateRows.map((r) => ({ id: r.id, fromCurrency: r.fromCurrency, rate: Number(r.rate) }))} canEdit={canEditWorkspace} showBaseCurrencyApprox={workspace.showBaseCurrencyApprox !== false} />
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

                </CardContent>
              </Card>
            </>
          }
          integrations={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Google Calendar{" "}
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
                    Soon
                  </span>
                </CardTitle>
                <CardDescription>
                  {t(
                    "Integrasi Google Calendar sedang dalam tahap verifikasi oleh Google dan akan segera tersedia.",
                    "Google Calendar integration is pending Google verification and will be available soon.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleCalendarConnect
                  configured={false}
                  connected={googleStatus.connected}
                  email={googleStatus.connection?.googleAccountEmail ?? null}
                  status={googleStatus.connection?.status ?? null}
                  lastError={googleStatus.connection?.lastError ?? null}
                  redirectUri={getGoogleRedirectUri()}
                />
              </CardContent>
            </Card>
          }
          billing={<BillingPage searchParams={Promise.resolve({})} showHeader={false} />}
        />
      </Suspense>
    </div>
  );
}
