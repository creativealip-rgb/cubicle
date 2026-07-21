import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { workspaces, workspaceMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, Users, Receipt, Calendar, Sparkles, Mail, ImageIcon, Plug } from "lucide-react";
import { TeamManager } from "@/components/settings/team-manager";
import { ReplyToEmailForm } from "@/components/settings/reply-to-email-form";
import { WorkspaceBrandingForm } from "@/components/settings/workspace-branding-form";
import { WorkspaceNameForm } from "@/components/settings/workspace-name-form";
import { BookingSlugForm } from "@/components/settings/booking-slug-form";
import { GoogleCalendarConnect } from "@/components/settings/google-calendar-connect";
import { SettingsTabs } from "@/components/settings/settings-tabs";
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

  const sp = searchParams ? await searchParams : undefined;
  const rawTab = sp?.tab;
  const initialTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Pengaturan", "Settings")}</h1>
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
              <CardContent>
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
                    invoiceEmailBody: workspace.invoiceEmailBody,
                  }}
                />
              </CardContent>
            </Card>
          }
          integrations={
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" /> Email Reply-To
                  </CardTitle>
                  <CardDescription>
                    {t(
                      "Atur alamat Reply-To agar balasan klien masuk ke inbox pribadimu.",
                      "Set a Reply-To address so client replies go to your personal inbox.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReplyToEmailForm
                    workspaceId={workspace.id}
                    currentValue={workspace.replyToEmail}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t(
                      "Kosongkan untuk gunakan pengirim default. Balasan akan dikirim ke alamat ini jika diatur.",
                      "Leave empty to use default sender. Replies will be sent to this address if set.",
                    )}
                  </p>
                </CardContent>
              </Card>

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
            </div>
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
