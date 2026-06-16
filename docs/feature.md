# Cubicle — Feature Drafts & Backlog

> **Purpose:** Future feature ideas, not committed to any sprint. Each item
> includes problem, scope, effort, dependencies, and "when to ship" trigger.
>
> **Last updated:** 16 June 2026
> **Status:** All items = 📋 BACKLOG (not planned for active sprint)
>
> **Promotion criteria** (item graduates from here to `cubicle_remaining_plan.md`):
> 1. ICP decision made (A/B/C/D)
> 2. Alip commits effort budget
> 3. Dependencies unblocked
>
> **Tracking:** when promoted, copy entry to `cubicle_remaining_plan.md` as
> P2.X section + remove from this file.

---

## AI Assistant (RAG over workspace) — ⭐ HIGHLIGHTED · Sprint F SHIPPED v1.1

> **Status 16 Jun:** v1.1 SHIPPED (12 tools, persistence, action confirm).
> See `docs/ai-assistant.md` for full reference.
> Phase 2 (embeddings + semantic search) still in backlog — F-2 below.

**v1.1 SHIPPED (16 Jun) — agentic RAG via tool calls:**
- 10 read tools: list + entity drill-down for clients/projects/tasks/invoices/team
- 2 action tools: update_task_status, draft_invoice_reminder (UI-confirmed)
- Conversation persistence (auto-titled, history sidebar)
- Terse-caveman voice, IDR-formatted, entity names not raw IDs
- No embeddings — 9router `/v1/embeddings` returned "Invalid API key" on current key
- Cost: ~$0.01/Q, 1k Qs ≈ $10/mo

**Scope (Phase 2 — still pending):**
```text
1. Add pgvector + embeddings table + sync-on-write trigger
   (when /v1/embeddings becomes available)
2. Drop-in replace tool results with vector search results
3. Multi-turn: keep last 5-10 question context
4. Per-file content indexing (currently metadata only)
5. Code execution sandbox (Phase 3) for "compute my tax"
```

**Effort: 1-2 minggu MVP** (basic RAG + chat UI + 5 quick actions)
**Phase 2: 2-3 mgu** (per-file content indexing, multi-turn context, code execution)

**Cost estimate (haiku-4.5 via 9router):**
- Embedding: ~$0.0001 per workspace doc
- LLM call: ~$0.001 per question
- 1000 questions/month = ~$1/mo per workspace. Cheap.

**Risk: medium**
- Hallucination: mitigated by cited sources + "I don't know" fallback
- Latency: 1-3s acceptable for chat
- Privacy: workspace data ke external LLM — needs disclosure + opt-out flag

**Differentiator:** competitor AI tools (Notion AI, ClickUp AI) operate on
their own data model. Cubicle AI = "AI yg tau SEMUA project lo" (clients,
invoice, time, expense, file, contract — semua di 1 workspace). They
can't replicate without full client-ops data.

**When to ship v2:** after 9router exposes working `/v1/embeddings` endpoint
OR after P2.8 Finance ships (so reports can be AI-summarized).

**Strategic:** this is THE feature buat "anti-spreadsheet" positioning
(SOUL.md audience). "Chat with your business" > 6 tabs + spreadsheet.

---

## Tier 1: High value + medium effort (review when ICP clear)

### F-01 Recurring / subscription billing

- **Problem:** invoice one-time only. Gak handle "monthly Rp 5jt × 6 bulan"
  (retainer client, package billing) workflow
- **Scope:** recurring invoice template, auto-generate per period, package
  billing (10 sessions @ X), proration on cancel
- **Effort:** 2-3 mgu
- **Dependencies:** ⚠️ payment gateway decision (P2.2/HOLD)
- **When to ship:** after payment gateway + ICP clear (🅒 coach/agency benefit most)

### F-02 Email automation / smart workflow

- **Problem:** freelancer manual follow up overdue invoice, manual welcome
  email, manual "project delivered" handoff
- **Scope:** rule engine "when X, do Y" — limited set:
  - invoice overdue 7 days → auto-remind client
  - project status = delivered → auto-send invoice draft
  - new client added → auto-welcome email
  - appointment 24h before → auto-reminder
- **Effort:** 1 mgu
- **Dependencies:** none (use P2.6 Reply-To)
- **When to ship:** after P2.6 ships, no ICP gate
- **Differentiator:** generic Zapier = setup overhead. Built-in = 1 click.

### F-03 Client chat / messaging in portal

- **Problem:** portal = read-only (file/invoice/project). Freelancer + client
  komunikasi via WhatsApp = context lost in chat scroll
- **Scope:** text chat per project, file attach, mark unread, email digest
- **Effort:** 1-2 mgu
- **Dependencies:** none
- **When to ship:** when 🅒 vertical (coach/designer benefit most dari chat)
- **Differentiator:** tied ke project context, not generic chat (Slack/Discord)

---

## Tier 2: High value + medium effort (plan later)

### F-04 Loom-style async video message

- **Problem:** freelancer sering kirim "video update progress" ke client.
  Loom = $12.5/mo external
- **Scope:** record in-browser (MediaRecorder API), upload ke R2,
  transcribe via Whisper, link to project
- **Effort:** 2-3 mgu
- **Dependencies:** R2 storage cost naik (1 min video ≈ 5-10 MB)
- **When to ship:** when 🅒 vertical (designers love this) OR
  when paying customer asks

### F-05 Calendar sync (Google/Outlook 2-way)

- **Problem:** booking page ada tapi gak sync ke personal calendar client
- **Scope:** Google Calendar + Outlook OAuth, 2-way event sync, conflict detect
- **Effort:** 1-2 mgu
- **Dependencies:** OAuth provider setup + per-user token storage
- **When to ship:** when booking usage high OR 🅒 vertical (coach)

### F-06 Workspace analytics dashboard

- **Problem:** dashboard minimal. Gak ada revenue trend / capacity / win rate
- **Scope:** Chart.js widgets: revenue 6/12 mo, top clients, capacity heatmap,
  pipeline forecast, expense ratio
- **Effort:** 1-2 mgu
- **Dependencies:** P2.8 reports (can reuse aggregations)
- **When to ship:** after P2.8 ships

---

## Tier 3: Quick wins (3-5 days each, low risk)

### F-07 Saved email/contract templates

- **Problem:** freelancer kirim email template ke client berkali-kali. Copy-paste
- **Scope:** templates table, variables ({{client_name}}, {{project_name}}),
  insert in invoice email or portal comment
- **Effort:** 3-5 hari
- **When to ship:** anytime. Pairs well with P2.6 (Reply-To) and P2.7 (contract).

### F-08 Client satisfaction (NPS) post-project

- **Problem:** no learning loop / testimonial generator
- **Scope:** when project status = completed → auto-send 1-question NPS,
  store response, optional public testimonial
- **Effort:** 3-5 hari
- **When to ship:** anytime. Low priority.

### F-09 Recurring expense auto-create (P2.8.3)

- **Problem:** "hosting monthly Rp 150rb" — manual entry tiap bulan
- **Scope:** `expense_recurring` table + cron job per workspace
- **Effort:** 3-5 hari
- **Dependencies:** P2.8.1 (expense CRUD)
- **When to ship:** P2.8 phase 2

---

## Tier 4: Skip (effort too high or value unclear)

| Item | Reason skip |
|---|---|
| Mobile native app | Effort 1-2 bulan, not justified sampai paying customer minta. Web responsive cukup. |
| White-label / custom branding | Agency premium niche. Later. |
| Zapier integration | Generic, manual setup overhead. Built-in automation (F-02) covers 80%. |
| AI receipt OCR (P2.8.3) | Useful but defer. Manual entry OK untuk MVP. |
| CRM / sales pipeline | Keluar dari "client ops" positioning. Don't dilute. |
| Multi-currency FX | Out of scope. Most Indonesian user 1 currency. |
| Goal/OKR tracker | Different category. Skip. |
| Habit tracker | Personal productivity, not client ops. Skip. |
| Built-in team chat | Slack/Discord exist. Skip. |
| Native video calls | Zoom/Meet exist. Skip. |

---

## Promotion decision matrix

When Alip asks to promote F-X to plan, check:

```text
1. ICP clear? (A/B/C/D)
   - 🅐 Indonesian depth → F-01, F-09 highest value
   - 🅱 minimalist        → F-02, F-07 highest value
   - 🅒 vertical          → F-03, F-04, F-05 highest value
2. Dependencies unblocked?
   - F-01 needs payment gateway
   - F-04/F-05 needs R2 capacity check
3. Effort fit budget?
4. Strategic alignment?
   - "more complete product" → F-02, F-07, F-09
   - "deeper moat"           → F-01, F-08, AI Assistant
   - "wow demo moment"       → AI Assistant
```

**Default if unprompted:** items stay in backlog, reviewed at start of each sprint planning.
