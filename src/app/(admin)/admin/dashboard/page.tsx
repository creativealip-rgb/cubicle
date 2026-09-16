import Link from "next/link";
import { BarChart3, Building2, CreditCard, Users } from "lucide-react";

const links = [
  { href: "/users", label: "Users", description: "Manage accounts and access", icon: Users },
  { href: "/workspaces", label: "Workspaces", description: "Inspect workspace ownership", icon: Building2 },
  { href: "/payments", label: "Payments", description: "Review payment records", icon: CreditCard },
  { href: "/analytics", label: "Analytics", description: "Growth, product, revenue, and retention", icon: BarChart3 },
];

export default function AdminDashboardPage() {
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Control-plane operations. Analytics lives in its own workspace.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{links.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-violet-200 hover:shadow-sm">
      <Icon className="size-5 text-[#6647F0]" /><h2 className="mt-4 text-sm font-semibold text-slate-900 group-hover:text-[#6647F0]">{label}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </Link>)}</div>
  </div>;
}
