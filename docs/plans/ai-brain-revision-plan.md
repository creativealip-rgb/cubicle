1|# Cubiqlo AI Brain — Product & UX Revision Plan
2|
3|**Tanggal:** 26 Juli 2026
4|**Status:** Approved planning handoff; implementation pending
5|**Target:** `https://dev.cubiqlo.com/app/brain`
6|**Scope:** positioning, naming, localization, empty state, chat workspace, capability discovery, conversation history, confirmation UX, mobile/accessibility, tests
7|**Out of scope:** production deploy, AI provider replacement, autonomous background agent, new destructive tools, Prompt Studio redesign
8|
9|## 1. Objective
10|
11|Turn AI Brain from a generic embedded chatbot into a clear Cubiqlo operational assistant that:
12|
13|1. Reads authorized workspace data.
14|2. Answers operational and financial questions.
15|3. Helps users find clients, projects, tasks, invoices, proposals, contracts, expenses, and questionnaire data.
16|4. Proposes supported actions and executes mutations only after explicit confirmation.
17|5. Works consistently in Indonesian and English.
18|
19|Primary positioning:
20|
21|> Asisten operasional yang memahami workspace Cubiqlo, membantu mengecek kondisi bisnis, mencari informasi, dan menyelesaikan tindakan terkontrol.
22|
23|AI Brain is not a content generator. Marketing content remains in Prompt Studio.
24|
25|## 2. Verified Current State
26|
27|Live dev QA found:
28|
29|- Full-page route: `/app/brain`.
30|- Main component: `src/components/ai/chat-panel.tsx`, currently about 1,300 lines and shared with floating variant.
31|- Empty state has one central composer, data-source icons, Recent section, and three Suggested cards.
32|- Interface copy is mostly English even when language selector is `ID`.
33|- Sidebar label is `Brain`, which does not communicate user value.
34|- Empty Recent column wastes space when no chats exist.
35|- Mobile hero and cards consume too much vertical space; composer is not thumb-oriented.
36|- Existing system supports streaming status/content/tool/confirmation/error/done events.
37|- Existing conversation persistence API supports list, load, and delete.
38|- Existing action flow supports confirmation for:
39|  - `update_task_status`
40|  - `draft_invoice_reminder`
41|- Existing tool registry contains 31 tools, including workspace summary, clients, projects, tasks, invoices, search, expenses, P&L, revenue, invoice aging, proposals, cash-flow forecast, contracts, questionnaires, and entity details.
42|
43|The revision must surface these real capabilities without promising unsupported mutations.
44|
45|## 3. Product Boundaries
46|
47|### AI Assistant owns
48|
49|- Workspace summaries.
50|- Operational questions.
51|- Financial questions based on Cubiqlo records.
52|- Workspace search.
53|- Client/project/task/invoice/proposal/contract/questionnaire lookup.
54|- Drafting workspace-derived status updates.
55|- Task status mutation after confirmation.
56|- Invoice reminder draft after confirmation.
57|
58|### Prompt Studio owns
59|
60|- Social content.
61|- Ad copy.
62|- Visual prompts.
63|- Carousel copy.
64|- Video scripts/storyboards.
65|- Product photography prompts.
66|
67|Do not add Prompt Studio generators to AI Assistant quick actions.
68|
69|### Safety boundary
70|
71|- Read tools may run automatically within current authorization.
72|- Mutation/action tools require explicit confirmation.
73|- UI must state exactly what will happen.
74|- Never label a draft as sent.
75|- Do not add autonomous write actions in this phase.
76|- Preserve workspace-level authorization and access helpers.
77|
78|## 4. Naming & Navigation
79|
80|### Sidebar
81|
82|Change localized labels while preserving route `/app/brain`:
83|
84|```text
85|ID: Asisten
86|EN: Assistant
87|```
88|
89|AI group becomes:
90|
91|```text
92|AI
93|├── Asisten
94|└── Prompt Studio
95|```
96|
97|Recommended Prompt label:
98|
99|```text
100|ID: Prompt Studio
101|EN: Prompt Studio
102|```
103|
104|Do not rename route or database tables in this revision.
105|
106|### Page title
107|
108|ID:
109|
110|```text
111|Asisten Kerja
112|```
113|
114|EN:
115|
116|```text
117|Work Assistant
118|```
119|
120|Internal component/type names may retain `Brain` temporarily, but user-facing copy must not.
121|
122|## 5. Localization Contract
123|
124|All page-owned text must follow current `ID/EN` language selector:
125|
126|- heading and subtitle
127|- input placeholder
128|- suggested actions
129|- category names
130|- capability labels
131|- recent/history labels
132|- timestamps
133|- loading/status text
134|- empty/error states
135|- confirmation cards
136|- delete confirmation
137|- buttons and accessibility labels
138|
139|ID examples:
140|
141|```text
142|Apa yang ingin kamu cek hari ini?
143|Tanya soal klien, proyek, tugas, invoice, dan kondisi bisnis dari data workspace kamu.
144|Tulis pertanyaan atau perintah…
145|Riwayat percakapan
146|Chat baru
147|Menganalisis data…
148|Mencari invoice…
149|```
150|
151|EN equivalents remain available.
152|
153|Do not display raw internal strings such as:
154|
155|```text
156|Running list_clients…
157|No chats yet. Start one above.
158|Delete conversation
159|```
160|
161|Map tool/status names to localized human labels. Never expose raw provider/model errors to normal users.
162|
163|## 6. Core Information Architecture
164|
165|### 6.1 Empty state
166|
167|Desktop structure:
168|
169|```text
170|Asisten Kerja                              Riwayat
171|
172|Apa yang ingin kamu cek hari ini?
173|Tanya data workspace atau minta bantuan menyelesaikan pekerjaan.
174|
175|[ Tulis pertanyaan atau perintah…                         Kirim ]
176|
177|Terhubung dengan:
178|Klien · Proyek · Tugas · Invoice · Keuangan · Proposal · Kontrak
179|
180|Mulai dari sini
181|[Ringkas minggu ini] [Cek invoice terlambat]
182|[Prioritas hari ini] [Buat update klien]
183|```
184|
185|Requirements:
186|
187|- One clear focal composer.
188|- No empty Recent column.
189|- Capability strip is informative, not a row of tiny pseudo-buttons.
190|- Maximum four initial quick actions.
191|- `Lihat semua bantuan` opens categorized actions.
192|- No provider/model/token information in first fold.
193|
194|### 6.2 Active conversation
195|
196|After first user message, transition to chat workspace:
197|
198|```text
199|Header: Asisten Kerja | Chat baru | Riwayat
200|Scrollable message thread
201|Tool/status feedback
202|Confirmation cards
203|Sticky composer
204|```
205|
206|Requirements:
207|
208|- Remove large empty-state hero immediately.
209|- Keep thread width readable: about 760–900px desktop.
210|- Composer sticks to bottom of Brain viewport, not browser page body.
211|- Only message thread scrolls once; avoid nested body/panel scroll.
212|- Preserve `100dvh` mobile behavior.
213|- Abort/stop remains available while streaming if current behavior supports it.
214|
215|### 6.3 History
216|
217|Move Recent into:
218|
219|- right drawer on desktop
220|- full-height sheet on mobile
221|
222|Header actions:
223|
224|- Chat baru
225|- Riwayat
226|
227|History item:
228|
229|```text
230|Invoice terlambat bulan ini
231|2 menit lalu
232|```
233|
234|Requirements:
235|
236|- localized relative date
237|- active conversation state
238|- search/filter if practical in current API; otherwise phase P1
239|- delete confirmation
240|- item-specific deleting state
241|- empty state does not occupy main workspace
242|- preserve conversation selection and loading
243|
244|## 7. Quick Action Taxonomy
245|
246|Show four context-safe defaults initially. Full list grouped in `Lihat semua bantuan`.
247|
248|### Ringkasan
249|
250|- Ringkas minggu ini
251|- Kondisi bisnis
252|- Prioritas hari ini
253|
254|### Keuangan
255|
256|- Cek invoice terlambat
257|- Ringkas pemasukan dan pengeluaran bulan ini
258|- Lihat klien dengan pendapatan terbesar
259|- Perkirakan arus kas
260|- Buat draft reminder pembayaran
261|
262|### Pekerjaan
263|
264|- Tampilkan tugas terlambat
265|- Proyek mana yang perlu perhatian?
266|- Apa yang masih terbuka minggu ini?
267|- Cari pekerjaan terkait klien tertentu
268|
269|### Klien
270|
271|- Klien mana yang perlu follow-up?
272|- Ringkas progres klien
273|- Buat update progres untuk klien
274|- Cari data klien
275|
276|### Penjualan & Dokumen
277|
278|- Tampilkan proposal yang masih terbuka
279|- Cari kontrak klien
280|- Ringkas jawaban questionnaire
281|
282|Rules:
283|
284|- A quick action may prefill composer or submit immediately; use one behavior consistently.
285|- Recommended: prefill composer, letting user review/edit before send.
286|- Suggestions must only imply capabilities supported by current tool registry.
287|- Entity-specific suggestions should ask for missing entity instead of inventing one.
288|- Do not hardcode demo entities such as `Kopi Senja` or invoice `INV-0001` in production-facing defaults.
289|
290|## 8. Capability Discovery
291|
292|Use concise capability groups rather than seven tiny module icons alone:
293|
294|```text
295|Bisa membaca
296|Klien, proyek, tugas, invoice, keuangan, proposal, kontrak, questionnaire
297|
298|Bisa membantu melakukan
299|Ubah status tugas dan siapkan draft reminder invoice — selalu dengan konfirmasi
300|```
301|
302|Optional `Apa yang bisa dilakukan?` sheet lists capabilities and safety boundary.
303|
304|Do not claim direct access to files/calendar/time unless corresponding current tools truly query them. UI copy must follow verified tool registry, not old module icons.
305|
306|## 9. Message & Tool UX
307|
308|### Streaming status
309|
310|Map internal statuses:
311|
312|- `thinking` → `Menganalisis pertanyaan…`
313|- `list_clients` → `Mencari data klien…`
314|- `list_projects` → `Mencari data proyek…`
315|- `list_tasks` → `Memeriksa tugas…`
316|- `list_invoices` / `invoice_aging` → `Memeriksa invoice…`
317|- finance tools → `Menghitung data keuangan…`
318|- search → `Mencari di workspace…`
319|- proposals/contracts/questionnaires → localized domain status
320|
321|Unknown tools fall back to `Memeriksa data workspace…`; never print raw tool identifier.
322|
323|### Tool results
324|
325|Default chat should show the assistant answer, not raw tool payload. Optional collapsible `Data yang diperiksa` may show human-readable source summaries. Do not expose raw JSON.
326|
327|### Errors
328|
329|Human errors:
330|
331|```text
332|Data workspace belum bisa diperiksa. Coba lagi.
333|Jawaban berhenti sebelum selesai. Kirim ulang pertanyaan.
334|Koneksi AI sedang bermasalah. Data kamu tidak diubah.
335|```
336|
337|Log technical details server-side. Sanitize upstream response bodies.
338|
339|### Usage
340|
341|Token/model metadata must not appear in standard conversation UI. If retained for debugging, gate it to development/admin detail.
342|
343|## 10. Confirmation UX
344|
345|### Update task status
346|
347|Card:
348|
349|```text
350|Perubahan yang akan dilakukan
351|Tugas: [title]
352|Status sekarang: [current]
353|Status baru: [new]
354|Alasan: [reason, optional]
355|
356|Batalkan | Konfirmasi perubahan
357|```
358|
359|Acceptance:
360|
361|- Confirmation is explicit and item-specific.
362|- Button locks while submitting.
363|- Success shows final state.
364|- Failure preserves card and explains no change occurred.
365|- Repeated confirm cannot execute twice.
366|
367|### Draft invoice reminder
368|
369|Card:
370|
371|```text
372|Draft reminder pembayaran
373|Invoice: [number]
374|Penerima: [email or Belum tersedia]
375|Subjek: [subject]
376|Isi: [editable/readable body]
377|
378|Batalkan | Salin draft | Konfirmasi draft
379|```
380|
381|Use labels matching real action behavior. If action only saves/returns a draft, never show `Kirim`.
382|
383|### Future mutations
384|
385|No new mutation tool enters quick actions until it has:
386|
387|- authorization check
388|- confirmation schema
389|- idempotency/replay protection where needed
390|- audit log
391|- success/failure test
392|- honest UX copy
393|
394|## 11. Mobile Design
395|
396|Empty state:
397|
398|- compact title/subtitle
399|- composer visible within first fold where practical
400|- capability line condensed
401|- quick actions as compact stacked rows or horizontal scroll, not tall cards
402|- 44px minimum controls
403|
404|Active conversation:
405|
406|- full-width thread
407|- sticky bottom composer respecting safe-area inset
408|- history as full-height sheet
409|- send/stop reachable by thumb
410|- composer grows to sensible max height, then scrolls internally
411|- keyboard opening must not hide latest message or send button
412|- no horizontal overflow at 375px and 390px
413|
414|The floating `N` seen in audit appears external/browser overlay; do not design around it unless reproduced as app-owned DOM.
415|
416|## 12. Accessibility
417|
418|- Semantic heading and landmark structure.
419|- Composer has visible label or accessible name.
420|- Enter sends; Shift+Enter inserts newline; preserve current hint.
421|- Buttons have localized accessible names.
422|- `aria-live` for streaming status and action results, without announcing every token.
423|- Focus moves predictably when starting/loading/deleting a conversation.
424|- Drawer/sheet traps focus and returns it to trigger.
425|- Confirmation dialog/card supports keyboard use.
426|- Selected quick action and active conversation do not rely on color alone.
427|- Respect reduced motion.
428|- Verify 200% zoom.
429|
430|## 13. Technical Refactor Plan
431|
432|Current `chat-panel.tsx` is too large and contains floating/full-page variants. Refactor behavior-preserving boundaries before or alongside UI changes.
433|
434|Recommended files:
435|
436|```text
437|src/components/ai/chat-panel.tsx             orchestration/shared state
438|src/components/ai/assistant-empty-state.tsx  full-page welcome
439|src/components/ai/assistant-thread.tsx       messages + streaming state
440|src/components/ai/assistant-composer.tsx     input/voice/send/stop
441|src/components/ai/assistant-history.tsx      drawer/sheet/list
442|src/components/ai/assistant-quick-actions.tsx
443|src/components/ai/assistant-confirmation.tsx
444|src/lib/ai/ui-copy.ts                        localized copy/status mapping
445|src/lib/ai/quick-actions.ts                   typed action registry
446|```
447|
448|Requirements:
449|
450|- Do not duplicate API/chat logic between floating and full-page variants.
451|- Preserve floating assistant behavior outside `/app/brain` unless explicitly changed.
452|- Keep route `/app/brain`.
453|- Keep SSE parsing, abort, persistence, confirmation, and conversation APIs working.
454|- Extract UI-only registries; server authorization remains server-side.
455|- Do not perform a DB migration unless proven required.
456|
457|## 14. API & Security Guardrails
458|
459|Audit during implementation:
460|
461|1. `/api/ai/chat` derives active authorized workspace; remove demo-slug assumptions if still present and unsafe.
462|2. Conversation list/load/delete must be scoped to current user/workspace.
463|3. Action endpoint must revalidate authorization at execution time, not trust confirmation payload from client.
464|4. Tool args must be validated.
465|5. Raw upstream body must not be returned to client errors.
466|6. Rate limit and monthly cap behavior remain active.
467|7. Conversation content must not cross workspace boundaries.
468|8. Mutation action has audit trail.
469|
470|Any discovered authorization gap is P0 and blocks release of the redesign.
471|
472|## 15. Implementation Phases
473|
474|### Phase A — Naming, localization, capability registry
475|
476|1. Rename user-facing Brain to Asisten/Assistant.
477|2. Add complete ID/EN UI copy registry.
478|3. Add localized tool/status labels.
479|4. Add typed quick-action categories based on real tools.
480|5. Remove hardcoded demo entities from suggestions.
481|
482|**Acceptance:** switching ID/EN updates all Assistant-owned text without reload inconsistencies.
483|
484|### Phase B — Empty state redesign
485|
486|1. Replace current two-column Recent/Suggested area.
487|2. Add focused composer and four quick actions.
488|3. Add capability/safety explanation.
489|4. Move history trigger to header.
490|
491|**Acceptance:** first-time user can explain what Assistant reads and does within one screen.
492|
493|### Phase C — Active chat workspace
494|
495|1. Compact page after first message.
496|2. Build single-scroll thread.
497|3. Add sticky composer.
498|4. Humanize streaming/tool status.
499|5. Sanitize errors and hide technical metadata.
500|
501|**Acceptance:** long desktop/mobile conversation remains usable and latest response stays reachable.
502|
503|### Phase D — History and confirmation
504|
505|1. Move history to drawer/sheet.
506|2. Localize timestamps and states.
507|3. Add delete confirmation and row-specific loading.
508|4. Polish task-status and invoice-draft confirmation cards.
509|5. Add replay/double-submit protection where missing.
510|
511|**Acceptance:** history never consumes empty-state space; no mutation executes without explicit confirmation.
512|
513|### Phase E — Security, responsive, accessibility QA
514|
515|1. Verify workspace scoping on chat/conversations/actions.
516|2. Verify action authorization and audit behavior.
517|3. Test 1440×1000, 1280×800, 390×844, 375×812.
518|4. Test keyboard, focus, screen-reader announcements, 200% zoom.
519|5. Run authenticated dev E2E and production non-regression guard.
520|
521|## 16. Test Plan
522|
523|### Unit tests
524|
525|- ID/EN copy registry covers all keys.
526|- Tool status mapping never exposes raw tool names.
527|- Unknown tool fallback is human-readable.
528|- Quick actions reference supported capability/tool intent.
529|- No demo entity/ID remains in default quick actions.
530|- Relative dates localize correctly.
531|- Confirmation state prevents duplicate execution.
532|- Error sanitizer strips upstream/provider details.
533|
534|### Component/integration tests
535|
536|- Empty state shows four primary suggestions and no empty Recent column.
537|- Quick action prefills composer.
538|- Sending first message switches to active chat layout.
539|- Composer sticks and preserves Enter/Shift+Enter behavior.
540|- Streaming status is announced and localized.
541|- History drawer preserves active draft/message state.
542|- Delete requires confirmation and scopes loading to one row.
543|- Task action remains pending until explicit confirmation.
544|- Invoice reminder is labeled draft, not sent.
545|- Floating variant still opens and chats outside Brain page.
546|
547|### Authenticated E2E on dev
548|
549|Use approved QA credentials without printing them.
550|
551|1. Login and open `/app/brain`.
552|2. Verify ID copy, then EN copy.
553|3. Ask workspace summary; verify real tool-backed answer.
554|4. Ask overdue invoice summary; verify localized status and answer.
555|5. Ask for a known QA client/project; verify entity lookup.
556|6. Request task status change; cancel once, confirm once, verify DB/UI result and no duplicate mutation.
557|7. Request invoice reminder; verify it remains a draft.
558|8. Start new chat, load history, delete a disposable chat.
559|9. Verify mobile keyboard/composer/history behavior.
560|10. Verify another workspace/user cannot access conversation/entity IDs outside membership.
561|11. Verify production image and container start time remain unchanged.
562|
563|Use mocked AI/SSE for automated suites. Limit final real-provider smoke to low-cost calls against dev data.
564|
565|## 17. Quality Gates
566|
567|Run targeted tests during iteration, then:
568|
569|```bash
570|npm run lint
571|npx tsc --noEmit
572|npm test
573|npm run build
574|```
575|
576|Visual evidence required:
577|
578|- desktop empty state
579|- mobile empty state
580|- desktop active thread
581|- mobile active thread + keyboard-safe composer
582|- history drawer/sheet
583|- task confirmation before/success
584|- invoice draft confirmation
585|- ID and EN states
586|
587|## 18. Definition of Done
588|
589|- Sidebar shows Asisten/Assistant, route unchanged.
590|- All Assistant-owned copy follows ID/EN selector.
591|- Empty state clearly states data access and action boundary.
592|- Four focused quick actions replace generic/demo suggestions.
593|- Empty Recent column removed.
594|- Active chat uses compact thread and sticky composer.
595|- Raw tool/model/provider strings hidden from normal UI.
596|- History uses drawer/sheet with confirmation-safe deletion.
597|- Task mutation remains confirmation-first and replay-safe.
598|- Invoice reminder is honestly labeled as draft.
599|- Existing 31 read/action tool behavior remains available where authorized.
600|- Floating assistant has no regression.
601|- Workspace/user boundaries pass negative tests.
602|- Desktop/mobile/accessibility checks pass.
603|- Lint, TypeScript, tests, and build pass.
604|- Verified on `dev.cubiqlo.com`.
605|- Production remains untouched until Alip approves release.
606|
607|## 19. Coder Guardrails
608|
609|1. Read `AGENTS.md`, canonical workflow, hardening plan, and this plan first.
610|2. Check git status; preserve unrelated and untracked work.
611|3. Work only on dev environment and dev DB.
612|4. Do not deploy production.
613|5. Do not rename route or destructively rewrite conversation history.
614|6. Do not add unsupported action claims.
615|7. Do not weaken confirmation, authorization, rate limit, cap, or audit logic.
616|8. Do not expose credentials, model/provider internals, tool JSON, or upstream error bodies.
617|9. Test floating and full-page variants.
618|10. Report security gaps immediately; do not hide them behind UI polish.
619|
620|## 20. Suggested Coder Prompt
621|
622|```text
623|Implement docs/plans/ai-brain-revision-plan.md in /root/projects/cubicle.
624|
625|Read first:
626|- AGENTS.md
627|- docs/dev-production-workflow-plan.md
628|- docs/architecture-security-hardening-plan.md
629|- docs/plans/ai-brain-revision-plan.md
630|
631|Follow phases A–E. Preserve unrelated work and existing conversations. Work only on dev.cubiqlo.com with isolated dev data. Do not deploy production. Reposition Brain as localized Asisten/Assistant, redesign empty and active chat states, move history to drawer/sheet, humanize tool statuses/errors, and preserve confirmation-first mutations. Keep floating assistant behavior. Verify workspace scoping and action authorization. Run targeted tests, lint, TypeScript, full tests, build, authenticated desktop/mobile E2E, and production non-regression guard. Return changed files, real test output, screenshots, security findings, known limitations, and exact dev URL.
632|```
633|