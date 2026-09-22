import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import {
  accounts,
  authTrustedDevices,
  passkeys,
  twoFactors,
  workspaces,
  workspaceMembers,
  users,
  workspaceCurrencyRates,
} from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Users,
  Receipt,
  Calendar,
  Sliders,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TeamManager } from "@/components/settings/team-manager";
import { WorkspaceBrandingForm } from "@/components/settings/workspace-branding-form";
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

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const [currentUser] = await db
    .select({
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      plan: users.plan,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const [credentialPassword, passkeyRows, twoFactorRows, trustedDeviceRows] =
    await Promise.all([
      db
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, user.id),
            eq(accounts.providerId, "credential"),
          ),
        )
        .limit(1),
      db
        .select({
          id: passkeys.id,
          name: passkeys.name,
          deviceType: passkeys.deviceType,
          createdAt: passkeys.createdAt,
        })
        .from(passkeys)
        .where(eq(passkeys.userId, user.id))
        .orderBy(passkeys.createdAt),
      db
        .select({ id: twoFactors.id })
        .from(twoFactors)
        .where(eq(twoFactors.userId, user.id))
        .limit(1),
      db
        .select({
          id: authTrustedDevices.id,
          deviceLabel: authTrustedDevices.deviceLabel,
          userAgent: authTrustedDevices.lastSeenUserAgent,
          ipAddress: authTrustedDevices.lastSeenIp,
          lastUsedAt: authTrustedDevices.lastUsedAt,
          expiresAt: authTrustedDevices.expiresAt,
        })
        .from(authTrustedDevices)
        .where(
          and(
            eq(authTrustedDevices.userId, user.id),
            isNull(authTrustedDevices.revokedAt),
          ),
        )
        .orderBy(desc(authTrustedDevices.lastUsedAt)),
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
      done: Boolean(
        Number(workspace.defaultTaxRate) > 0 || workspace.defaultHourlyRate,
      ),
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
  const workspaceSetupDone = workspaceSetupItems.filter(
    (item) => item.done,
  ).length;
  const invoiceSetupDone = invoiceSetupItems.filter((item) => item.done).length;

  const sp = searchParams ? await searchParams : undefined;
  const rawTab = sp?.tab;
  const initialTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const recovered = sp?.recovered === "1";
  const currentTrustedDeviceId =
    (await cookies()).get("cubiqlo.trusted_device")?.value.split(".", 1)[0] ??
    null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sliders}
        title={t("Pengaturan", "Settings")}
        description={t(
          "Kelola profil akun, workspace, tim, preferensi invoice, dan integrasi.",
          "Manage account profile, workspace, team, invoice preferences, and integrations.",
        )}
      />

      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        }
      >
        <SettingsTabs
          initialTab={initialTab}
          workspace={
            <>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" /> Workspace
                    </CardTitle>
                    {workspaceSetupDone < workspaceSetupItems.length ? (
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        {workspaceSetupDone}/{workspaceSetupItems.length} {t("selesai", "done")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        ✓ {t("Profil Lengkap", "Profile Complete")}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {t(
                      "Profil workspace dan branding bisnis kamu untuk tagihan dan preview klien.",
                      "Your workspace profile and business branding for invoices and client preview.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <WorkspaceBrandingForm
                      section="workspace"
                      canEdit={canEditWorkspace}
                      workspaceName={workspace.name}
                      plan={currentUser?.plan as "free" | "solo" | "team"}
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
                    />
                </CardContent>
              </Card>
            </>
          }
          account={
            <div className="grid gap-4 lg:grid-cols-2">
              {recovered && (
                <div
                  role="status"
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 lg:col-span-2"
                >
                  <p className="font-semibold">
                    {t("Akses akun dipulihkan", "Account access recovered")}
                  </p>
                  <p className="mt-1">
                    {t(
                      "Sebaiknya ganti email dan password sekarang. Dashboard tetap dapat digunakan.",
                      "We recommend changing your email and password now. Your dashboard remains available.",
                    )}
                  </p>
                </div>
              )}
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
                      recovered={recovered}
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
                  trustedDevices={trustedDeviceRows}
                  currentTrustedDeviceId={currentTrustedDeviceId}
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
                    : t(
                        "Lihat anggota tim workspace.",
                        "View workspace team members.",
                      )}
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
                          <p className="font-medium">
                            {member.name || member.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
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
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" /> {t("Default Invoice", "Invoice Defaults")}
                    </CardTitle>
                    {invoiceSetupDone < invoiceSetupItems.length ? (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                        {invoiceSetupDone}/{invoiceSetupItems.length} {t("selesai", "done")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        ✓ {t("Invoice Siap", "Invoice Ready")}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {t(
                      "Mata uang, terms pembayaran, pajak/rate, dan email balasan untuk tagihan klien.",
                      "Currency, payment terms, tax/rate, and reply-to email for client invoicing.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WorkspaceBrandingForm
                    section="invoice"
                    canEdit={canEditWorkspace}
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
                  />
                  <CurrencyRatesForm
                    baseCurrency={workspace.defaultCurrency || "IDR"}
                    rates={currencyRateRows.map((r) => ({
                      id: r.id,
                      fromCurrency: r.fromCurrency,
                      rate: Number(r.rate),
                    }))}
                    canEdit={canEditWorkspace}
                    showBaseCurrencyApprox={
                      workspace.showBaseCurrencyApprox !== false
                    }
                  />
                </CardContent>
              </Card>
            </>
          }
          integrations={
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Google Calendar
                  <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 px-2.5 py-0.5 text-[11px] font-bold shadow-2xs">
                    Soon
                  </span>
                </CardTitle>
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
          billing={
            <BillingPage
              searchParams={Promise.resolve({})}
              showHeader={false}
            />
          }
        />
      </Suspense>
    </div>
  );
}
