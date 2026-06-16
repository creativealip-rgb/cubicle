# Cubicle AI Assistant

> **Status:** Live · **Component:** floating chat panel on every `/app/*` route
> **Model:** tr/MiniMax-M3 via 9router (OpenAI-compatible)
> **Architecture:** agentic RAG — model calls structured tool functions, no embeddings

## What it is

A workspace assistant that knows your data. Ask in natural language, it calls DB-backed tools, returns terse answers. Can also act (with your confirm) — mark tasks done, draft invoice reminders.

Available in every authed page via the **sparkle button** (bottom-right). Click → panel opens.

## Architecture (high level)

```
User question
   ↓
POST /api/ai/chat  (chat-panel.tsx)
   ↓
Chat route: build messages = [system prompt, ...history, user msg]
   ↓
tr/MiniMax-M3 (9router /v1/chat/completions)
   ↓   tool_calls?
executeTool(name, args) — Drizzle queries
   ↓   tool returns JSON
push tool result back to model (loop, max 3 rounds)
   ↓   no tool_calls
final assistant content → response
   ↓
persisted to ai_messages (per conversation)
   ↓
UI renders assistant bubble (no leaked reasoning tags)
```

**No embeddings.** 9router's `/v1/embeddings` endpoint is unavailable on the current key. Phase 2 (deferred) will add pgvector + sync-on-write for semantic search.

## Tools (12)

### Read (always safe, 10)

| Tool | Purpose | Key args |
|---|---|---|
| `list_clients` | List clients | `status`, `limit` |
| `list_projects` | List projects | `status`, `clientId`, `limit` |
| `list_tasks` | List tasks | `status` (csv), `projectId`, `assigneeId`, `dueBefore`, `limit` |
| `list_invoices` | List invoices | `status` (csv), `limit` |
| `get_workspace_summary` | Metrics (counts, overdue, unpaid total) | — |
| `list_workspace_members` | Team lookup (name → UUID) | — |
| `get_client` | Single client + recent projects + open invoices | `id` OR `name` |
| `get_project` | Single project + client + tasks | `id` OR `name` |
| `get_task` | Single task + project + assignee | `id` OR `title` |
| `get_invoice` | Single invoice + client + items + payments | `id` OR `number` |

### Action (user must confirm, 2)

| Tool | Confirmation payload | After confirm |
|---|---|---|
| `update_task_status` | `{ taskId, taskTitle, currentStatus, newStatus, reason }` | `tasks.status` updated |
| `draft_invoice_reminder` | `{ invoiceId, invoiceNumber, to, subject, body }` | `sendNotification()` (Resend, dev→console) |

The model calls the action tool → gets a `confirmation` object back → describes the proposal briefly → UI shows amber confirm card with **Confirm** / **Cancel** buttons. Nothing writes until user clicks.

## Conversation persistence

Two new tables (`scripts/migrate-ai-tables.sql`):

| Table | Purpose |
|---|---|
| `ai_conversations` | One per chat session. Has `workspaceId`, `userId`, `title` (auto from first user message), timestamps |
| `ai_messages` | Every user/assistant/tool message. Stores role, content, tool calls (jsonb), tool name, token count |

Conversation list visible in panel sidebar (click History icon). Click row to load. New chat button to start fresh. Delete icon to remove.

## Environment variables

```env
# AI Assistant (OpenAI-compatible, used by /api/ai/chat)
AI_API_KEY=sk-...             # or mount at /run/secrets/9router_api_key
AI_BASE_URL=https://9router-168-144-37-19.sslip.io/v1
AI_MODEL=tr/MiniMax-M3
```

Resolution order: `/run/secrets/9router_api_key` → `AI_API_KEY` env.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/ai/chat` | required | Send a user message, get assistant reply. Body: `{ messages, conversationId? }`. Persists to DB. Returns `{ message, usage, toolCalls, conversationId }` |
| `GET` | `/api/ai/chat` | — | Status: `{ enabled, model }` |
| `GET` | `/api/ai/conversations` | required | List user's conversations |
| `GET` | `/api/ai/conversations?id=...` | required | Load one conversation's messages |
| `POST` | `/api/ai/conversations` | required | Create empty (or get-or-create if `id` passed) |
| `DELETE` | `/api/ai/conversations?id=...` | required | Delete conversation |
| `POST` | `/api/ai/action` | required | Execute confirmed action. Body: `{ kind: "update_task_status" \| "draft_invoice_reminder", payload }` |

## Security & limits

- **Auth required** on every endpoint
- **Workspace-scoped** — tools only query the user's active workspace (`acme-creative` for demo; production would resolve from session)
- **Tool round cap** — 3 rounds per turn prevents runaway loops
- **History cap** — last 20 user+assistant messages from request, then sent to model
- **Action tools never write** — model can only return a confirmation object; UI gates the actual `POST /api/ai/action` call
- **60s max duration** on chat endpoint (Vercel-style timeout)
- **Strip thinking** — model output runs through `stripThinking()` to drop `<think>...</think>` blocks (MiniMax-M3 emits reasoning; we don't expose it)

## Cost reality (per 1k Qs, rough)

| Question type | Tool calls | Avg tokens | Est cost |
|---|---|---|---|
| Summary ("how's the business?") | 1 | ~7K | $0.007 |
| Drill-down ("tell me about Kopi Senja") | 1 | ~8K | $0.008 |
| Multi-tool ("summarize everything") | 3 | ~16K | $0.016 |
| Action ("mark X done") | 2 | ~9K | $0.009 |

1k questions/month ≈ $10/mo. Phase 2 (streaming) cuts first-token latency but not token cost.

## Files

| Path | Purpose |
|---|---|
| `src/lib/ai/client.ts` | 9router client (server-only, `fs` import) |
| `src/lib/ai/strip.ts` | Pure `stripThinking()` — Client-safe |
| `src/lib/ai/tools.ts` | 12 tool defs + DB executors |
| `src/lib/ai/system-prompt.ts` | Terse-caveman system prompt with tool rules |
| `src/lib/ai/conv-store.ts` | Persistence helpers (get/create/list/append/autoTitle) |
| `src/app/api/ai/chat/route.ts` | Chat endpoint with tool loop + action-confirm |
| `src/app/api/ai/action/route.ts` | Execute confirmed action |
| `src/app/api/ai/conversations/route.ts` | List/load/delete/create |
| `src/components/ai/chat-panel.tsx` | Floating button + panel + history sidebar + confirm cards |
| `scripts/migrate-ai-tables.sql` | Schema for `ai_conversations` + `ai_messages` |

## Known gaps

- **No streaming yet** (Sprint F.2). First-token latency 1-3s, response appears all at once.
- **Action endpoint depends on real Resend key** for actual email delivery. Dev mode logs to console.
- **Streaming**, **embeddings** (semantic search), **smart nudges** (proactive dashboard banner) all deferred to Phase 2/3.
- **Workspace is hardcoded to `acme-creative`** in `tools.ts` and `chat/route.ts` (matches demo data). Production would resolve from session.

## Try it

1. Open https://cubicle.168-144-37-19.sslip.io/app/dashboard
2. Login (owner@cubicle.test / password123)
3. Click sparkle button (bottom-right)
4. Try:
   - "How's the business?"
   - "Any overdue invoices?"
   - "Tell me about Kopi Senja"
   - "Mark 'Internal budget review' as done" → confirm card appears
   - "Draft a payment reminder for INV-0001" → confirm card with subject + body
