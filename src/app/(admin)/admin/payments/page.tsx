import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPayments } from "@/lib/actions/admin/payments";
import { formatDateID, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status as "pending" | "completed" | "failed" | "expired" | undefined;
  const page = Number(sp.page) || 1;

  const data = await listPayments({ status, page });

  const statuses = ["pending", "completed", "failed", "expired"] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#292D34]">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Read-only payment log · {data.total} total — page {data.page} / {data.totalPages}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/payments"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!status ? "bg-[#6647F0] text-white" : "bg-white text-[#292D34] border border-[#D9D9D9]"}`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/payments?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === s ? "bg-[#6647F0] text-white" : "bg-white text-[#292D34] border border-[#D9D9D9]"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-4 md:hidden">
            {data.payments.map((p) => (
              <div key={p.id} className="rounded-xl border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold">{formatMoney(p.amount)}</p><p className="font-mono text-xs text-muted-foreground">{p.orderId}</p></div><Badge variant={p.status === "completed" ? "success" : p.status === "pending" ? "warning" : "secondary"}>{p.status}</Badge></div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Workspace</dt><dd>{p.workspaceName ?? "—"}</dd></div><div><dt className="text-muted-foreground">Plan / type</dt><dd>{p.plan} · {p.paymentType}</dd></div><div><dt className="text-muted-foreground">Paid</dt><dd>{p.paidAt ? formatDateID(p.paidAt) : "—"}</dd></div></dl>
              </div>
            ))}
            {data.payments.length === 0 && <p className="py-8 text-center text-muted-foreground">No payments found.</p>}
          </div>
          <div className="hidden overflow-x-auto md:block"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Workspace</TableHead>
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
                  <TableCell>{p.workspaceName ?? "—"}</TableCell>
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
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          {page > 1 && (
            <Link
              href={`/payments?status=${status ?? ""}&page=${page - 1}`}
              className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-sm text-[#292D34] hover:bg-slate-50"
            >
              Prev
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {data.totalPages}
          </span>
          {page < data.totalPages && (
            <Link
              href={`/payments?status=${status ?? ""}&page=${page + 1}`}
              className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-sm text-[#292D34] hover:bg-slate-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
