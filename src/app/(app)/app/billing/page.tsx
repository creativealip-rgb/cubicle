import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getCurrentLang, createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const plans = [
  {
    key: "free",
    name: "Free",
    price: "Rp 0",
    description: "Coba dulu buat client work kecil.",
    features: ["1 pengguna", "3 klien", "Project & task", "Invoice", "Time tracking"],
  },
  {
    key: "solo",
    name: "Solo",
    price: "Rp 49rb/bulan",
    description: "Untuk freelancer yang butuh unlimited clients.",
    features: ["1 pengguna", "Klien unlimited", "Client portal", "AI assistant", "Booking", "Proposal & kontrak"],
  },
  {
    key: "team",
    name: "Team",
    price: "Rp 99rb/bulan",
    description: "Untuk team kecil yang handle banyak client bareng.",
    features: ["5 pengguna", "Workspace bersama", "Peran tim", "Laporan lanjutan", "Prioritas support"],
  },
] as const;

export default async function BillingPage() {
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-[#6647F0]">{t("Billing", "Billing")}</p>
        <h1 className="text-3xl font-semibold text-slate-950">{t("Langganan", "Subscription")}</h1>
        <p className="mt-2 text-slate-600">
          {t("Bayar via Pakasir QRIS. Plan aktif otomatis setelah webhook payment diterima.", "Pay via Pakasir QRIS. Plan activates automatically after payment webhook is received.")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Plan saat ini", "Current Plan")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p><span className="font-medium text-slate-950">{t("Plan", "Plan")}:</span> {currentPlan.toUpperCase()}</p>
          {user?.planExpiresAt && (
            <p><span className="font-medium text-slate-950">{t("Berlaku hingga", "Valid until")}:</span> {user.planExpiresAt.toLocaleDateString(lang === "en" ? "en-US" : "id-ID")}</p>
          )}
          {user && (() => {
            const sub = getSubscriptionStatus(user.planExpiresAt, currentPlan);
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
          const isCurrent = currentPlan === plan.key;
          const paid = plan.key === "solo" || plan.key === "team";
          return (
            <Card key={plan.key} className={plan.key === "solo" ? "border-[#6647F0] shadow-lg" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{t("Aktif", "Active")}</span>}
                </CardTitle>
                <p className="text-2xl font-semibold text-slate-950">{plan.price}</p>
                <p className="text-sm text-slate-600">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <ul className="space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
                </ul>
                {paid ? (
                  <CheckoutButton plan={plan.key} disabled={isCurrent}>
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
    </div>
  );
}
