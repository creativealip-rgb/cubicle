import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserActions } from "@/components/admin/user-actions";
import { getUserDetail } from "@/lib/actions/admin/users";
import { formatDateID, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const data = await getUserDetail(userId);
  if (!data) notFound();

  const { user } = data;

  const role = (user as { role?: string }).role ?? "user";
  const banned = Boolean((user as { banned?: boolean }).banned);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#292D34]">
            {user.name || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <UserActions
          user={{
            id: user.id,
            name: user.name ?? null,
            email: user.email,
            emailVerified: user.emailVerified ?? false,
            role: role as "user" | "admin",
            banned,
            plan: user.plan ?? "free",
            planExpiresAt: user.planExpiresAt ?? null,
            createdAt: user.createdAt,
            workspaceCount: 0,
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant={user.plan === "free" ? "secondary" : "success"}>{user.plan}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{user.planExpiresAt ? formatDateID(user.planExpiresAt) : "Permanent"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span>{role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              {banned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="success">Active</Badge>}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDateID(user.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stats</CardTitle>
            <CardDescription>Scoped to workspaces this user owns</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold">{data.stats.clients}</p>
              <p className="text-xs text-muted-foreground">Clients</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{data.stats.projects}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{data.stats.invoices}</p>
              <p className="text-xs text-muted-foreground">Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspaces</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ownedWorkspaces.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.slug}</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateID(w.createdAt)}</TableCell>
                </TableRow>
              ))}
              {data.ownedWorkspaces.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No workspaces owned.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.orderId}</TableCell>
                  <TableCell>{p.plan}</TableCell>
                  <TableCell>{p.paymentType}</TableCell>
                  <TableCell>{formatMoney(p.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "completed" ? "success" : p.status === "pending" ? "warning" : "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.paidAt ? formatDateID(p.paidAt) : "—"}</TableCell>
                </TableRow>
              ))}
              {data.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No payments.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
