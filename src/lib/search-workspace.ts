import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, projects, tasks } from "@/db/schema";

export type SearchKind = "client" | "project" | "task" | "invoice";

export type WorkspaceSearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
  status?: string | null;
  href: string;
};

export type WorkspaceSearchResult = {
  query: string;
  count: number;
  results: WorkspaceSearchHit[];
};

function hrefFor(kind: SearchKind, id: string): string {
  switch (kind) {
    case "client":
      return `/app/clients/${id}`;
    case "project":
      return `/app/projects/${id}`;
    case "task":
      return `/app/tasks?focus=${id}`;
    case "invoice":
      return `/app/invoices/${id}`;
  }
}

/**
 * Workspace global search for UI + AI.
 * Prefer ILIKE partial match (always available). Also OR email/company for clients
 * and invoice number.
 */
export async function searchWorkspaceEntities(args: {
  workspaceId: string;
  q: string;
  limit?: number;
  kinds?: SearchKind[];
}): Promise<WorkspaceSearchResult> {
  const q = (args.q ?? "").trim();
  const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
  const kinds = new Set<SearchKind>(
    args.kinds ?? ["client", "project", "task", "invoice"],
  );
  if (!q) return { query: "", count: 0, results: [] };

  const pattern = `%${q}%`;
  const results: WorkspaceSearchHit[] = [];
  // Fetch a bit more per kind then merge/sort by title match quality.
  const perKind = Math.min(limit, 20);

  if (kinds.has("client")) {
    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.companyName,
        email: clients.email,
        status: clients.status,
      })
      .from(clients)
      .where(
        and(
          eq(clients.workspaceId, args.workspaceId),
          or(
            sql`${clients.name} ILIKE ${pattern}`,
            sql`coalesce(${clients.companyName}, '') ILIKE ${pattern}`,
            sql`coalesce(${clients.email}, '') ILIKE ${pattern}`,
          ),
        ),
      )
      .orderBy(sql`${clients.updatedAt} desc`)
      .limit(perKind);

    for (const r of rows) {
      results.push({
        kind: "client",
        id: r.id,
        title: r.name,
        subtitle: r.company || r.email || null,
        status: r.status,
        href: hrefFor("client", r.id),
      });
    }
  }

  if (kinds.has("project")) {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        description: projects.description,
      })
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, args.workspaceId),
          or(
            sql`${projects.name} ILIKE ${pattern}`,
            sql`coalesce(${projects.description}, '') ILIKE ${pattern}`,
          ),
        ),
      )
      .orderBy(sql`${projects.updatedAt} desc`)
      .limit(perKind);

    for (const r of rows) {
      results.push({
        kind: "project",
        id: r.id,
        title: r.name,
        subtitle: r.description?.slice(0, 80) || null,
        status: r.status,
        href: hrefFor("project", r.id),
      });
    }
  }

  if (kinds.has("task")) {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        description: tasks.description,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, args.workspaceId),
          or(
            sql`${tasks.title} ILIKE ${pattern}`,
            sql`coalesce(${tasks.description}, '') ILIKE ${pattern}`,
          ),
        ),
      )
      .orderBy(sql`${tasks.updatedAt} desc`)
      .limit(perKind);

    for (const r of rows) {
      results.push({
        kind: "task",
        id: r.id,
        title: r.title,
        subtitle: r.description?.slice(0, 80) || null,
        status: r.status,
        href: hrefFor("task", r.id),
      });
    }
  }

  if (kinds.has("invoice")) {
    const rows = await db
      .select({
        id: invoices.id,
        number: invoices.invoiceNumber,
        status: invoices.status,
        notes: invoices.notes,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.workspaceId, args.workspaceId),
          or(
            sql`${invoices.invoiceNumber} ILIKE ${pattern}`,
            sql`coalesce(${invoices.notes}, '') ILIKE ${pattern}`,
          ),
        ),
      )
      .orderBy(sql`${invoices.updatedAt} desc`)
      .limit(perKind);

    for (const r of rows) {
      results.push({
        kind: "invoice",
        id: r.id,
        title: r.number,
        subtitle: r.notes?.slice(0, 80) || null,
        status: r.status,
        href: hrefFor("invoice", r.id),
      });
    }
  }

  // Prefer exact/prefix title matches first.
  const qLower = q.toLowerCase();
  results.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const score = (title: string) => {
      if (title === qLower) return 0;
      if (title.startsWith(qLower)) return 1;
      if (title.includes(qLower)) return 2;
      return 3;
    };
    const d = score(aTitle) - score(bTitle);
    if (d !== 0) return d;
    return aTitle.localeCompare(bTitle);
  });

  const sliced = results.slice(0, limit);
  return { query: q, count: sliced.length, results: sliced };
}
