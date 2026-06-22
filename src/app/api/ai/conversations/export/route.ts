/**
 * Export an AI conversation as Markdown.
 *
 * GET /api/ai/conversations/export?id=...
 *   → 200 text/markdown (Content-Disposition: attachment)
 *
 * Body:
 *   # Cubiqlo AI — <conversation title>
 *   *Exported YYYY-MM-DD HH:mm UTC*
 *   ---
 *   **You** · 2026-06-16 14:00
 *   List all invoices.
 *   **Cubiqlo AI** · 2026-06-16 14:00 · 1 tool call · 320 tokens
 *   3 invoices...
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getWorkspaceId(): Promise<string> {
  const { workspaces } = await import("@/db/schema");
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const wsId = await getWorkspaceId();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Verify ownership
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, id),
        eq(aiConversations.workspaceId, wsId),
        eq(aiConversations.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, id))
    .orderBy(asc(aiMessages.createdAt));

  const md = renderMarkdown(conv.title, rows);
  const safeName =
    (conv.title || "conversation")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .slice(0, 60) || "conversation";

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="cubicle-ai-${safeName}.md"`,
    },
  });
}

function renderMarkdown(
  title: string,
  rows: Array<{
    role: string;
    content: string;
    toolName: string | null;
    toolCalls: unknown;
    tokens: number | null;
    createdAt: Date;
  }>,
): string {
  const exportedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const lines: string[] = [];
  lines.push(`# Cubiqlo AI — ${title || "Untitled conversation"}`);
  lines.push("");
  lines.push(`*Exported ${exportedAt} · ${rows.length} message${rows.length === 1 ? "" : "s"}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group by turn (user + assistant) — tool messages are inlined as a code block
  // in the assistant message that produced them.
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    const ts = r.createdAt instanceof Date
      ? r.createdAt.toISOString().replace("T", " ").slice(0, 16) + " UTC"
      : String(r.createdAt);
    if (r.role === "user") {
      lines.push(`**You** · ${ts}`);
      lines.push("");
      lines.push(r.content);
      lines.push("");
      i += 1;
    } else if (r.role === "assistant") {
      const tcCount = Array.isArray(r.toolCalls) ? r.toolCalls.length : 0;
      const meta = [];
      if (tcCount > 0) meta.push(`${tcCount} tool call${tcCount === 1 ? "" : "s"}`);
      if (r.tokens) meta.push(`${r.tokens} tokens`);
      const metaStr = meta.length ? ` · ${meta.join(" · ")}` : "";
      lines.push(`**Cubiqlo AI** · ${ts}${metaStr}`);
      lines.push("");
      if (tcCount > 0 && Array.isArray(r.toolCalls)) {
        for (const tc of r.toolCalls as Array<{ name: string }>) {
          lines.push(`> 🔧 \`${tc.name}\``);
        }
        lines.push("");
      }
      if (r.content) {
        lines.push(r.content);
        lines.push("");
      }
      i += 1;
    } else {
      // tool — usually not user-facing but include as code block for full fidelity
      if (r.toolName) {
        lines.push(`<details><summary>Tool: ${r.toolName}</summary>`);
        lines.push("");
        lines.push("```json");
        lines.push(r.content);
        lines.push("```");
        lines.push("");
        lines.push("</details>");
        lines.push("");
      }
      i += 1;
    }
  }

  return lines.join("\n");
}
