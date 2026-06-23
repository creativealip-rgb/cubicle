import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/billing/checkout-button";

const plans = [
  {
    key: "free",
    name: "Free",
    price: "Rp 0",
    description: "Coba dulu buat client work kecil.",
    features: ["1 user", "3 clients", "Project & task", "Invoice", "Time tracking"],
  },
  {
    key: "solo",
    name: "Solo",
    price: "Rp 49rb/bulan",
    description: "Untuk freelancer yang butuh unlimited clients.",
    features: ["1 user", "Unlimited clients", "Client portal", "AI assistant", "Booking", "Proposal & contract"],
  },
  {
    key: "team",
    name: "Team",
    price: "Rp 99rb/bulan",
    description: "Untuk team kecil yang handle banyak client bareng.",
    features: ["5 users", "Shared workspace", "Team roles", "Advanced report", "Priority support"],
  },
] as const;

export default async function BillingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  const [workspace] = userId
    ? await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          plan: workspaces.plan,
          planExpiresAt: workspaces.planExpiresAt,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, userId))
        .limit(1)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-[#6647F0]">Billing</p>
        <h1 className="text-3xl font-semibold text-slate-950">Upgrade workspace</h1>
        <p className="mt-2 text-slate-600">
          Bayar via Pakasir QRIS. Plan aktif otomatis setelah webhook payment diterima.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p><span className="font-medium text-slate-950">Workspace:</span> {workspace?.name ?? "-"}</p>
          <p><span className="font-medium text-slate-950">Plan:</span> {(workspace?.plan ?? "free").toUpperCase()}</p>
          {workspace?.planExpiresAt && (
            <p><span className="font-medium text-slate-950">Expires:</span> {workspace.planExpiresAt.toLocaleDateString("id-ID")}</p>
          )}
          {workspace?.role !== "owner" && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Hanya owner workspace yang bisa upgrade.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const current = workspace?.plan === plan.key;
          const paid = plan.key === "solo" || plan.key === "team";
          return (
            <Card key={plan.key} className={plan.key === "solo" ? "border-[#6647F0] shadow-lg" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {current && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Current</span>}
                </CardTitle>
                <p className="text-2xl font-semibold text-slate-950">{plan.price}</p>
                <p className="text-sm text-slate-600">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <ul className="space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
                </ul>
                {paid ? (
                  <CheckoutButton plan={plan.key}>{plan.key === "solo" ? "Bayar Solo QRIS" : "Bayar Team QRIS"}</CheckoutButton>
                ) : (
                  <div className="rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-600">Default plan</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
