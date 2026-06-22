import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { expenses, expenseCategories, projects, clients, workspaces, payments, invoices } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseForm, type CategoryOption, type ProjectOption, type ClientOption } from "@/components/expenses/expense-form";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { TrendingDown, TrendingUp, Wallet, Tag } from "lucide-react";

async function getWorkspace() {
  const [ws] = await db
    .select({ id: workspaces.id, defaultCurrency: workspaces.defaultCurrency })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws;
}

function formatMoney(amount: string | number, currency: string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (currency === "IDR") {
    return `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  }
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export default async function ExpensesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspace();
  const member = await assertWorkspaceMember(db, user.id, ws.id);
  const canWrite = member.role === "owner" || member.role === "member";

  // Categories
  const categoryRows = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.workspaceId, ws.id))
    .orderBy(expenseCategories.name);
  const categories: CategoryOption[] = categoryRows.map((c) => ({
    id: c.id, name: c.name, color: c.color, icon: c.icon,
  }));

  // Projects
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, ws.id))
    .orderBy(projects.name);
  const projectOpts: ProjectOption[] = projectRows;

  // Clients
  const clientRows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.workspaceId, ws.id))
    .orderBy(clients.name);
  const clientOpts: ClientOption[] = clientRows;

  // Expenses (latest 100)
  const expenseRows = await db
    .select({
      id: expenses.id,
      date: expenses.date,
      amount: expenses.amount,
      currency: expenses.currency,
      description: expenses.description,
      vendor: expenses.vendor,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      projectId: expenses.projectId,
      projectName: projects.name,
      clientId: expenses.clientId,
      clientName: clients.name,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .leftJoin(projects, eq(projects.id, expenses.projectId))
    .leftJoin(clients, eq(clients.id, expenses.clientId))
    .where(eq(expenses.workspaceId, ws.id))
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(100);

  // Stats
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthRows = expenseRows.filter((e) => e.date >= monthStart);
  const monthTotalIDR = monthRows.filter((e) => e.currency === "IDR").reduce((s, e) => s + parseFloat(e.amount), 0);
  const monthTotalUSD = monthRows.filter((e) => e.currency === "USD").reduce((s, e) => s + parseFloat(e.amount), 0);

  // Income this month (from paid invoices)
  const incomeRows = await db
    .select({ amount: payments.amount, paidAt: payments.paidAt })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(and(eq(invoices.workspaceId, ws.id), gte(payments.paidAt, monthStart)));
  const incomeIDR = incomeRows.filter((p) => p.paidAt && monthKey(p.paidAt) === monthKey(monthStart)).reduce((s, p) => s + parseFloat(p.amount), 0);

  // By category (this month, IDR only for simplicity)
  const byCategory: Record<string, { name: string; color: string; total: number }> = {};
  for (const e of monthRows) {
    if (e.currency !== "IDR") continue;
    const key = e.categoryId ?? "uncategorized";
    if (!byCategory[key]) byCategory[key] = { name: e.categoryName ?? "Uncategorized", color: e.categoryColor ?? "#64748b", total: 0 };
    byCategory[key].total += parseFloat(e.amount);
  }
  const categoryBreakdown = Object.values(byCategory).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Track what you spend to see what you keep.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">This month spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(monthTotalIDR, "IDR")}</div>
            {monthTotalUSD > 0 && (
              <p className="text-xs text-slate-500 mt-1">+ {formatMoney(monthTotalUSD, "USD")}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">This month income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(incomeIDR, "IDR")}</div>
            <p className="text-xs text-slate-500 mt-1">from paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Net this month</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${incomeIDR - monthTotalIDR >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatMoney(incomeIDR - monthTotalIDR, "IDR")}
            </div>
            <p className="text-xs text-slate-500 mt-1">income − expenses (IDR only)</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick add */}
      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick add</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              workspaceId={ws.id}
              defaultCurrency={ws.defaultCurrency}
              categories={categories}
              projects={projectOpts}
              clients={clientOpts}
              compact
            />
          </CardContent>
        </Card>
      )}

      {/* Category breakdown (IDR this month) */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              This month by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryBreakdown.map((c) => {
                const pct = monthTotalIDR > 0 ? (c.total / monthTotalIDR) * 100 : 0;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-40">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-sm">{c.name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                    </div>
                    <span className="text-sm tabular-nums w-32 text-right">{formatMoney(c.total, "IDR")}</span>
                    <span className="text-xs text-slate-500 w-12 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseRows.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No expenses yet. Add your first one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {canWrite && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseRows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{e.date}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{e.description}</div>
                      {e.vendor && <div className="text-xs text-slate-500">{e.vendor}</div>}
                    </TableCell>
                    <TableCell>
                      {e.categoryName ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.categoryColor ?? "#64748b" }} />
                          {e.categoryName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {e.projectName ?? <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {formatMoney(e.amount, e.currency)}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <DeleteExpenseButton expenseId={e.id} description={e.description} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
