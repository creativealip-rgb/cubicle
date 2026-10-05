import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { BillingCheckoutStatusCard } from "@/components/billing/billing-checkout-status-card";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getCurrentLang, createT } from "@/lib/i18n";
import { BILLING_PLANS } from "@/lib/billing-plans";
import { getPlanPeriodLabel } from "@/lib/billing-pricing";
import { listActiveAddOns } from "@/lib/actions/billing-addons";
import { AddonManagement } from "@/components/billing/addon-management";
import { AddonPurchaseControls } from "@/components/billing/addon-purchase-controls";
import { BillingTabsNav } from "@/components/billing/billing-tabs-nav";
import { getWorkspaceRecordForUser } from "@/lib/workspace";
import { getCheckoutStatusForWorkspaceOwner, type CheckoutStatus } from "@/lib/billing-checkout-status";
import { getEffectivePlan } from "@/lib/plan";
import { Check, Crown, Zap, Shield, Sparkles, Calendar, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const plans = [
  {
    key: "free",
    name: "Free Forever",
    price: "Rp 0",
    description: ["Coba dulu buat client work kecil.", "Try it for small client work."],
    features: [
      ["1 pengguna", "1 user"],
      ["1 workspace", "1 workspace"],
      ["3 klien", "3 clients"],
      ["5 proyek", "5 projects"],
      ["10 invoice/bulan", "10 invoices/month"],
      ["Client portal + AI", "Client portal + AI"],
      ["15 AI request/bulan", "15 AI requests/month"],
      ["Penyimpanan file aman", "Secure file storage"],
    ],
  },
  {
    key: "solo",
    name: "Solo",
    description: ["Untuk freelancer yang punya banyak klien.", "For freelancers with many clients."],
    features: [
      ["1 pengguna", "1 user"],
      ["3 workspace", "3 workspaces"],
      ["Klien, proyek, proposal, kontrak, dan invoice unlimited", "Unlimited clients, projects, proposals, contracts, and invoices"],
      ["Client portal + AI", "Client portal + AI"],
      ["150 AI request/bulan", "150 AI requests/month"],
      ["Kelola dan bagikan file klien", "Manage and share client files"],
    ],
  },
  {
    key: "team",
    name: "Team",
    description: ["Untuk team kecil yang handle banyak client bareng.", "For small teams handling many clients together."],
    features: [
      ["Maksimal 5 member/workspace", "Up to 5 members/workspace"],
      ["Maksimal 3 workspace", "Up to 3 workspaces"],
      ["Klien, proyek, proposal, kontrak, dan invoice unlimited", "Unlimited clients, projects, proposals, contracts, and invoices"],
      ["Client portal + AI", "Client portal + AI"],
      ["Peran tim", "Team roles"],
      ["1.000 AI request/bulan", "1,000 AI requests/month"],
      ["5 GB/workspace", "5 GB/workspace"],
      ["Penyimpanan bersama untuk tim", "Shared storage for your team"],
    ],
  },
] as const;

export default async function BillingPage({
  searchParams,
  showHeader = true,
}: {
  searchParams: Promise<{ checkout?: string; tab?: string }>;
  showHeader?: boolean;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  const user = userId
    ? await db
        .select({
          plan: users.plan,
          planExpiresAt: users.planExpiresAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const currentPlan = user?.plan ?? "free";
  const effectivePlan = getEffectivePlan(user?.plan, user?.planExpiresAt);
  const addons = userId
    ? await listActiveAddOns()
    : {
        storageAddons: [],
        extraWorkspaceEntitlements: [],
        extraMemberEntitlements: [],
        aiAddons: [],
      };

  const { checkout: checkoutOrderId, tab: rawTab } = await searchParams;
  const currentTab = rawTab === "addons" ? "addons" : "plans";
  let checkoutStatus: { status: CheckoutStatus; amount: string | null } | null = null;
  if (userId && checkoutOrderId) {
    const workspace = await getWorkspaceRecordForUser(userId);
    checkoutStatus = await getCheckoutStatusForWorkspaceOwner({
      userId,
      workspaceId: workspace.id,
      orderId: checkoutOrderId,
    });
  }

  const sub = user ? getSubscriptionStatus(user.planExpiresAt, currentPlan, lang) : null;

  return (
    <div className="space-y-6">
      {showHeader && (
        <PageHeader
          icon={CreditCard}
          title={t("Plan & Add-ons", "Plan & Add-ons")}
          description={t(
            "Kelola paket langganan dan kapasitas workspace Anda.",
            "Manage your subscription plan and workspace capacity.",
          )}
        />
      )}

      {checkoutStatus && (
        <BillingCheckoutStatusCard
          status={checkoutStatus.status}
          amount={checkoutStatus.amount}
          lang={lang}
        />
      )}

      <BillingTabsNav currentTab={currentTab} />

      {currentTab === "plans" && (
        <div className="space-y-5">
          {/* Streamlined Subscription Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-purple-500/[0.04] p-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
                {effectivePlan === "team" ? (
                  <Crown className="h-5 w-5" />
                ) : effectivePlan === "solo" ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("Plan Saat Ini", "Current Plan")}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-purple-600/10 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">
                    {effectivePlan}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.planExpiresAt ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {t("Berlaku hingga", "Valid until")}{" "}
                      <span className="font-semibold text-foreground">
                        {user.planExpiresAt.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { dateStyle: "long" })}
                      </span>
                    </span>
                  ) : (
                    t("Akses gratis tanpa batas waktu kedaluwarsa.", "Free tier with no expiration date.")
                  )}
                </p>
              </div>
            </div>

            {sub && sub.status !== "active" && (
              <div
                className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
                  sub.status === "expiring"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    : sub.status === "grace"
                      ? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {sub.message}
              </div>
            )}
          </div>

          {/* 3-Column Modern Pricing Cards */}
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = effectivePlan === plan.key;
              const paid = plan.key === "solo" || plan.key === "team";
              const planConfig = paid ? BILLING_PLANS[plan.key] : null;

              return (
                <div
                  key={plan.key}
                  className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all relative ${
                    isCurrent
                      ? "border-purple-600 bg-gradient-to-b from-purple-500/[0.04] to-card ring-1 ring-purple-600/50"
                      : "border-border/80 bg-card hover:border-border hover:shadow-sm"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t(plan.description[0], plan.description[1])}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          {t("Aktif", "Active")}
                        </span>
                      )}
                    </div>

                    {/* Price Tag */}
                    <div className="pt-1 pb-2 border-b border-border/50">
                      {paid && planConfig ? (
                        <div>
                          <div className="text-2xl font-mono font-bold text-foreground">
                            {lang === "en" ? (plan.key === "solo" ? "$6" : "$12") : getPlanPeriodLabel(plan.key, "monthly")}
                            <span className="text-xs font-normal text-muted-foreground">/{t("bulan", "month")}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {t("Ditagih tahunan", "Billed yearly")} ·{" "}
                            {lang === "en" ? (plan.key === "solo" ? "$72" : "$144") : getPlanPeriodLabel(plan.key, "yearly")}
                            /{t("tahun", "year")}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl font-mono font-bold text-foreground">
                            {lang === "en" ? "$0" : "Rp 0"}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {t("Tanpa biaya berlangganan", "Free forever, no credit card")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("Fitur Termasuk", "Features Included")}
                      </p>
                      <ul className="space-y-2 text-xs text-foreground/90">
                        {plan.features.map((feature) => (
                          <li key={feature[0]} className="flex items-start gap-2">
                            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </div>
                            <span className="leading-tight">{t(feature[0], feature[1])}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div className="mt-6 pt-3">
                    {paid ? (
                      <CheckoutButton plan={plan.key} showPeriodToggle={false} disabled={isCurrent}>
                        {isCurrent
                          ? t("Plan Aktif", "Active Plan")
                          : plan.key === "solo"
                            ? t("Bayar Solo QRIS", "Pay Solo QRIS")
                            : t("Bayar Team QRIS", "Pay Team QRIS")}
                      </CheckoutButton>
                    ) : (
                      <div className="rounded-xl bg-muted/60 px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                        {t("Plan Default", "Default Plan")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {currentTab === "addons" && (
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardContent className="space-y-6 pt-6">
            <AddonPurchaseControls effectivePlan={effectivePlan} />
            <AddonManagement
              storageAddons={addons.storageAddons}
              extraWorkspaceEntitlements={addons.extraWorkspaceEntitlements}
              extraMemberEntitlements={addons.extraMemberEntitlements}
              aiAddons={addons.aiAddons}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
