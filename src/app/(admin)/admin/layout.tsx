import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * (admin) route group layout — the control-plane gate.
 * Every admin page is behind requireAdmin(); the individual server actions
 * ALSO call requireAdmin() (defense-in-depth, see src/lib/admin.ts).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/login");
  }
  return <AdminShell>{children}</AdminShell>;
}
