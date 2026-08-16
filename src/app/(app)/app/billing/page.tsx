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
import { getWorkspaceRecordForUser } from "@/lib/workspace";
import { getCheckoutStatusForWorkspaceOwner, type CheckoutStatus } from "@/lib/billing-checkout-status";
import { getEffectivePlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

const plans = [
  {
    key: "free",
    name: "Free Forever",
    price: "Rp 0",
    description: ["Coba dulu buat client work kecil.", "Try it for small client work."],
    features: [["1 pengguna", "1 user"], ["1 workspace", "1 workspace"], ["3 klien", "3 clients"], ["5 proyek", "5 projects"], ["10 invoice/bulan", "10 invoices/month"], ["Client portal + AI", "Client portal + AI"], ["10 AI request/bulan", "10 AI requests/month"], ["5 MB/file", "5 MB/file"]],
  },
  {
    key: "solo",
    name: "Solo",
    description: ["Untuk freelancer yang butuh unlimited clients.", "For freelancers who need unlimited clients."],
    features: [["1 pengguna", "1 user"], ["3 workspace", "3 workspaces"], ["Klien/proyek/invoice unlimited", "Unlimited clients/projects/invoices"], ["Client portal + AI", "Client portal + AI"], ["100 AI request/bulan", "100 AI requests/month"], ["25 MB/file", "25 MB/file"]],
  },
  {
    key: "team",
    name: "Team",
    description: ["Untuk team kecil yang handle banyak client bareng.", "For small teams handling many clients together."],
    features: [["Maksimal 5 member/workspace", "Up to 5 members/workspace"], ["Maksimal 3 workspace", "Up to 3 workspaces"], ["Klien/proyek/invoice unlimited", "Unlimited clients/projects/invoices"], ["Peran tim", "Team roles"], ["1.000 AI request/bulan", "1,000 AI requests/month"], ["5 GB/workspace", "5 GB/workspace"], ["50 MB/file", "50 MB/file"]],
  },
] as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
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
  // Effective plan after expiry/grace — drives the Team-only extra-workspace
  // purchase gate on the client (the server re-checks and returns 409).
  const effectivePlan = getEffectivePlan(user?.plan, user?.planExpiresAt);
  const addons = userId ? await listActiveAddOns() : { storageAddons: [], extraWorkspaceEntitlements: [] };

  // Checkout status: only shown to the current workspace OWNER and only when
  // the order id belongs to that workspace. Members/viewers and foreign order
  // ids get `null` here, so the pakasir_payments lookup is never run for them.
  const { checkout: checkoutOrderId } = await searchParams;
  let checkoutStatus: { status: CheckoutStatus; amount: string | null } | null = null;
  if (userId && checkoutOrderId) {
    const workspace = await getWorkspaceRecordForUser(userId);
    checkoutStatus = await getCheckoutStatusForWorkspaceOwner({
      userId,
      workspaceId: workspace.id,
      orderId: checkoutOrderId,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="app-page-title">{t("Billing", "Billing")}</h1>
        <p className="mt-2 text-slate-600">
          {t(
            "Bayar bulanan atau tahunan via Pakasir QRIS, tanpa pajak. Plan aktif otomatis setelah webhook payment diterima.",
            "Pay monthly or yearly via Pakasir QRIS, tax-free. Plan activates automatically after payment webhook is received.",
          )}
        </p>
      </div>

      {checkoutStatus && (
        <BillingCheckoutStatusCard
          status={checkoutStatus.status}
          amount={checkoutStatus.amount}
          lang={lang}
        />
      )}

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">{t("Paket", "Plans")}</TabsTrigger>
          <TabsTrigger value="addons">{t("Add-on", "Add-ons")}</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("Plan saat ini", "Current Plan")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p><span className="font-medium text-slate-950">{t("Plan aktif", "Active plan")}:</span> {effectivePlan.toUpperCase()}</p>
              {currentPlan !== effectivePlan && (
                <p><span className="font-medium text-slate-950">{t("Plan terakhir", "Previous plan")}:</span> {currentPlan.toUpperCase()}</p>
              )}
              {user?.planExpiresAt && (
                <p><span className="font-medium text-slate-950">{t("Berlaku hingga", "Valid until")}:</span> {user.planExpiresAt.toLocaleDateString(lang === "en" ? "en-US" : "id-ID")}</p>
              )}
              {user && (() => {
                const sub = getSubscriptionStatus(user.planExpiresAt, currentPlan, lang);
                const badgeClass = sub.status === "active" ? "bg-emerald-50 text-emerald-800" :
                  sub.status === "expiring" ? "bg-amber-50 text-amber-800" :
                  sub.status === "grace" ? "bg-orange-50 text-orange-800" :
                  "bg-red-50 text-red-800";
                return <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${badgeClass}`}>{sub.message}</p>;
              })()}
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = effectivePlan === plan.key;
              const paid = plan.key === "solo" || plan.key === "team";
              const planConfig = paid ? BILLING_PLANS[plan.key] : null;
              return (
                <Card key={plan.key} className={plan.key === "solo" ? "border-[#6647F0] shadow-lg" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {isCurrent && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{t("Aktif", "Active")}</span>}
                    </CardTitle>
                    {paid && planConfig ? (
                      <div>
                        <p className="text-2xl font-semibold text-slate-950">
                          {getPlanPeriodLabel(plan.key, "monthly")}
                          <span className="text-sm font-normal text-slate-500">/{t("bulan", "month")}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t("Ditagih tahunan", "Billed yearly")} · {getPlanPeriodLabel(plan.key, "yearly")}/{t("tahun", "year")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-2xl font-semibold text-slate-950">Rp 0</p>
                    )}
                    <p className="text-sm text-slate-600">{t(plan.description[0], plan.description[1])}</p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ul className="space-y-2 text-sm text-slate-600">
                      {plan.features.map((feature) => <li key={feature[0]}>✓ {t(feature[0], feature[1])}</li>)}
                    </ul>
                    {paid ? (
                      <CheckoutButton plan={plan.key} showPeriodToggle={false} disabled={isCurrent}>
                        {isCurrent ? t("Plan aktif", "Active plan") : plan.key === "solo" ? t("Bayar Solo QRIS", "Pay Solo QRIS") : t("Bayar Team QRIS", "Pay Team QRIS")}
                      </CheckoutButton>
                    ) : (
                      <div className="rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-600">{t("Plan default", "Default plan")}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="addons">
          <Card>
            <CardHeader><CardTitle>{t("Storage & add-on", "Storage & add-ons")}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <AddonPurchaseControls effectivePlan={effectivePlan} />
              <AddonManagement storageAddons={addons.storageAddons} extraWorkspaceEntitlements={addons.extraWorkspaceEntitlements} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
