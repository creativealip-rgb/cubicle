import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, projects, workspaces, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

interface SearchParams {
  search?: string;
  status?: string;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";

  // Check plan for limit enforcement
  const [workspace] = await db.select({ plan: workspaces.plan }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const currentPlan = workspace?.plan ?? "free";
  const [{ clientCount }] = await db.select({ clientCount: sql<number>`count(*)::int` }).from(clients).where(eq(clients.workspaceId, workspaceId));
  const isAtLimit = currentPlan === "free" && clientCount >= 3;

  const params = await searchParams;
  const search = params.search ?? "";
  const statusFilter = params.status ?? "active";

  const whereClauses = [eq(clients.workspaceId, workspaceId)];

  if (statusFilter === "active") {
    whereClauses.push(eq(clients.status, "active"));
  } else if (statusFilter === "inactive") {
    whereClauses.push(eq(clients.status, "inactive"));
  } else if (statusFilter === "archived") {
    whereClauses.push(eq(clients.status, "archived"));
  }

  // Fetch clients with project counts
  const clientsList = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
      email: clients.email,
      phone: clients.phone,
      status: clients.status,
      tags: clients.tags,
      portalEnabled: clients.portalEnabled,
      createdAt: clients.createdAt,
      projectCount: sql<number>`count(${projects.id})::int`,
    })
    .from(clients)
    .leftJoin(projects, eq(projects.clientId, clients.id))
    .where(and(...whereClauses))
    .groupBy(clients.id)
    .orderBy(desc(clients.createdAt));

  // Filter by search term in app (client-side would be ideal, but server filtering for MVP)
  const filtered = search
    ? clientsList.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.companyName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : clientsList;

  // Get counts for tabs
  const [counts] = await db
    .select({
      active: sql<number>`count(case when ${clients.status} = 'active' then 1 end)::int`,
      inactive: sql<number>`count(case when ${clients.status} = 'inactive' then 1 end)::int`,
      archived: sql<number>`count(case when ${clients.status} = 'archived' then 1 end)::int`,
    })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));

  const tabCounts = counts ?? { active: 0, inactive: 0, archived: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Klien</h1>
          <p className="text-sm text-muted-foreground">
            Kelola hubungan klienmu
          </p>
        </div>
        {canWrite && (
          isAtLimit ? (
            <Button size="sm" className="gap-1" disabled>
              <Plus className="h-4 w-4" />
              Upgrade dulu
            </Button>
          ) : (
            <Button size="sm" className="gap-1" asChild>
              <Link href="/app/clients/new">
                <Plus className="h-4 w-4" />
                Tambah Klien
              </Link>
            </Button>
          )
        )}
      </div>

      {isAtLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-900">Batas free plan tercapai</p>
              <p className="text-sm text-amber-700 mt-1">Kamu punya {clientCount}/3 klien. Upgrade ke Solo untuk unlimited klien.</p>
            </div>
            <Button size="sm" className="bg-[#6647F0] hover:bg-[#5333DD] shrink-0">
              Upgrade ke Solo — Rp 49rb/bln
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue={statusFilter} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="active" asChild>
              <Link href="?status=active">Aktif ({tabCounts.active})</Link>
            </TabsTrigger>
            <TabsTrigger value="inactive" asChild>
              <Link href="?status=inactive">Tidak aktif ({tabCounts.inactive})</Link>
            </TabsTrigger>
            <TabsTrigger value="archived" asChild>
              <Link href="?status=archived">Arsip ({tabCounts.archived})</Link>
            </TabsTrigger>
          </TabsList>

          <form className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              defaultValue={search}
              placeholder="Cari klien..."
              className="pl-8"
            />
          </form>
        </div>

        <TabsContent value={statusFilter} className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border bg-card">
            <div className="grid grid-cols-7 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
              <div className="col-span-2">Klien</div>
              <div>Perusahaan</div>
              <div>Project</div>
              <div>Portal</div>
              <div>Status</div>
              <div className="text-right">Aksi</div>
            </div>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Tidak ada klien ditemukan
              </div>
            )}
            {filtered.map((client) => (
              <div
                key={client.id}
                className="grid grid-cols-7 gap-4 p-3 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <div className="col-span-2">
                  <Link href={`/app/clients/${client.id}`} className="font-medium hover:underline">
                    {client.name}
                  </Link>
                  {client.tags && client.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {client.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {client.companyName || "—"}
                </div>
                <div className="text-sm">{client.projectCount}</div>
                <div>
                  {client.portalEnabled ? (
                    <Badge variant="outline" className="gap-1 text-xs border-green-200 text-green-700">
                      <Globe className="h-3 w-3" /> Aktif
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <div>
                  <Badge
                    variant={client.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {client.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/app/clients/${client.id}`}>Lihat Detail</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/app/projects?clientId=${client.id}`}>Lihat Project</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Tidak ada klien ditemukan
              </div>
            )}
            {filtered.map((client) => (
              <Card key={client.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Link href={`/app/clients/${client.id}`} className="font-medium hover:underline">
                        {client.name}
                      </Link>
                      {client.companyName && (
                        <p className="text-sm text-muted-foreground">{client.companyName}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {client.projectCount} project
                        </Badge>
                        <Badge
                          variant={client.status === "active" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {client.status}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/app/clients/${client.id}`}>Lihat Detail</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
