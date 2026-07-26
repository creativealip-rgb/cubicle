1|# Cubiqlo Sidebar — Compact Flyout Navigation Plan
2|
3|**Tanggal:** 26 Juli 2026
4|**Status:** Approved planning handoff; implementation pending
5|**Target:** Cubiqlo authenticated app sidebar
6|**Target environment:** `https://dev.cubiqlo.com` only until Alip approves production release
7|**Scope:** sidebar information architecture, desktop flyout, collapsed behavior, mobile accordion, active state, badges, localization, accessibility, tests
8|**Out of scope:** route renaming, page redesigns, production deploy, permission-model changes
9|
10|## 1. Objective
11|
12|Reduce sidebar density while preserving fast access and clear mental models.
13|
14|Replace the current long list of child routes with compact top-level navigation groups. Desktop uses a flyout inspired by the supplied reference. Mobile uses an accordion because hover does not exist on touch devices.
15|
16|Primary decision:
17|
18|> Do not place Proyek and Tugas under Klien. Place Klien, Proyek, and Tugas under a neutral parent named Pekerjaan.
19|
20|Reason: clients, projects, and tasks are related operational objects, but neither Projects nor Tasks are strict children of Clients in global navigation.
21|
22|## 2. Current State
23|
24|Current `src/components/app-sidebar.tsx` renders:
25|
26|- Dashboard directly.
27|- Group label `Kerja`, always expanded.
28|- Klien, Proyek, Tugas, Waktu, Kalender, File as separate rows.
29|- Keuangan, Personal, and AI as collapsible section labels with child rows below.
30|- Expanded desktop width: 260px.
31|- Collapsed desktop width: 68px.
32|- Mobile/tablet: off-canvas sidebar up to 280px.
33|- Active route matching supports nested routes.
34|- Badge counts exist for open tasks and unpaid invoices.
35|- Personal routes are owner-only.
36|- ID/EN labels exist.
37|
38|Current group-heading accordion reduces some density but still keeps six Work items visible and uses section headings differently from actual navigable objects.
39|
40|## 3. Target Information Architecture
41|
42|### 3.1 Always-visible top-level items
43|
44|```text
45|Dashboard
46|────────────
47|Pekerjaan  ›
48|Waktu
49|Kalender
50|File
51|────────────
52|Keuangan   ›
53|Personal   ›   owner only
54|AI         ›
55|```
56|
57|Top-level ID/EN labels:
58|
59|- Dashboard / Dashboard
60|- Pekerjaan / Work
61|- Waktu / Time
62|- Kalender / Calendar
63|- File / Files
64|- Keuangan / Finance
65|- Personal / Personal
66|- AI / AI
67|
68|### 3.2 Pekerjaan flyout
69|
70|```text
71|PEKERJAAN
72|
73|Klien
74|Kelola relasi, data, dan portal klien
75|
76|Proyek
77|Pantau pekerjaan dan progres proyek
78|
79|Tugas                                      30
80|Lihat tugas terbuka dan prioritas
81|```
82|
83|Routes:
84|
85|- Klien → `/app/clients`
86|- Proyek → `/app/projects`
87|- Tugas → `/app/tasks`
88|
89|Task badge remains on child `Tugas`. Parent may show a small notification dot when closed/collapsed, not numeric `30`, because a numeric parent badge could be mistaken for total clients/projects.
90|
91|### 3.3 Keuangan flyout
92|
93|```text
94|KEUANGAN
95|
96|Invoice
97|Service
98|Pengeluaran
99|Laporan
100|```
101|
102|Routes remain unchanged:
103|
104|- `/app/invoices`
105|- `/app/packages`
106|- `/app/expenses`
107|- `/app/reports`
108|
109|Unpaid invoice badge remains on `Invoice`. Parent may show a small notification dot only.
110|
111|### 3.4 Personal flyout
112|
113|Owner-only:
114|
115|```text
116|PERSONAL
117|
118|Catatan
119|Jurnal
120|Landing Page
121|```
122|
123|Routes remain unchanged:
124|
125|- `/app/personal`
126|- `/app/journal`
127|- `/app/personal-site`
128|
129|Entire parent and children stay hidden for non-owner roles. Do not leak hidden labels through keyboard focus, DOM-only content, tooltip, or flyout state.
130|
131|### 3.5 AI flyout
132|
133|Align with approved AI plans:
134|
135|```text
136|AI
137|
138|Asisten
139|Prompt Studio
140|```
141|
142|Routes remain:
143|
144|- Asisten → `/app/brain`
145|- Prompt Studio → `/app/prompts`
146|
147|Localized labels:
148|
149|- Asisten / Assistant
150|- Prompt Studio / Prompt Studio
151|
152|If AI Brain plan has not landed when this plan is implemented, sidebar may still use the approved new user-facing label while route/component names remain unchanged.
153|
154|### 3.6 Keep direct access
155|
156|Do not hide these behind Pekerjaan:
157|
158|- Waktu: frequent timer workflow must stay one click away.
159|- Kalender: cross-client and cross-project use.
160|- File: cross-client and cross-project use.
161|
162|## 4. Desktop Expanded Interaction
163|
164|### 4.1 Hover plus click, never hover-only
165|
166|Parent behavior:
167|
168|- Pointer enter opens flyout after 120–180ms.
169|- Pointer leave schedules close after 250–350ms.
170|- Moving from parent to flyout cancels close timer.
171|- Clicking parent pins/toggles flyout.
172|- Clicking outside closes.
173|- `Escape` closes and restores focus to parent.
174|- Opening one flyout closes another.
175|- Route navigation closes flyout.
176|
177|Recommended defaults:
178|
179|```ts
180|OPEN_DELAY_MS = 150;
181|CLOSE_DELAY_MS = 300;
182|```
183|
184|Do not implement instant close. It creates a hover tunnel where the user cannot move diagonally into the panel.
185|
186|A safe polygon/triangle algorithm is optional. Delay plus a 6–8px invisible bridge between trigger and panel is sufficient for first implementation if tested carefully.
187|
188|### 4.2 Parent affordance
189|
190|- Use `ChevronRight`, not `ChevronDown`, because flyout opens sideways.
191|- Parent is a button, not a fake link.
192|- `aria-haspopup="menu"`.
193|- `aria-expanded` reflects state.
194|- Visible active state when any child route is active.
195|- Parent icon and label remain stable during opening.
196|
197|### 4.3 Flyout position
198|
199|- Position to right of sidebar.
200|- Gap: 6–8px.
201|- Width: 280px recommended; acceptable range 260–300px.
202|- Align panel top near trigger row.
203|- Clamp vertically so it remains inside viewport.
204|- Use portal/fixed positioning if sidebar overflow would clip panel.
205|- Layer above app content and below blocking dialogs.
206|- Do not shift page content.
207|
208|### 4.4 Flyout visual design
209|
210|- White background.
211|- Radius: 12px.
212|- Subtle border or inset ring.
213|- Soft shadow; no glass effect.
214|- Compact uppercase section title.
215|- Child rows use icon, title, optional one-line description, optional badge.
216|- Active child uses purple tint plus icon/text/ring, not color alone.
217|- Hover/focus state uses subtle slate surface.
218|- Minimum child hit target: 44px.
219|- Descriptions hidden if density becomes excessive at narrower heights.
220|
221|## 5. Desktop Collapsed Interaction
222|
223|Collapsed sidebar contains icons only.
224|
225|- Direct items navigate normally.
226|- Group icon opens flyout to the right on hover or click.
227|- Do not render a tooltip and flyout simultaneously.
228|- Group flyout includes visible title and children.
229|- Active child makes parent icon active.
230|- Badge-bearing parent may show a small dot.
231|- Flyout remains keyboard accessible.
232|
233|Collapsed state must not auto-expand the entire sidebar.
234|
235|## 6. Mobile & Tablet Interaction
236|
237|Do not use side flyout on touch/off-canvas navigation.
238|
239|Use accordion:
240|
241|```text
242|Pekerjaan                         ⌄
243|  Klien
244|  Proyek
245|  Tugas                          30
246|
247|Waktu
248|Kalender
249|File
250|
251|Keuangan                          ⌄
252|Personal                          ⌄
253|AI                                ⌄
254|```
255|
256|Requirements:
257|
258|- Tap parent opens/closes children below.
259|- Active route's parent auto-opens when mobile sidebar opens.
260|- Tap child navigates and closes mobile sidebar.
261|- Chevron down rotates to reflect expanded state.
262|- One group open at a time is recommended, except direct items.
263|- Touch targets minimum 44px.
264|- No hover dependency.
265|- No flyout panel extending beyond viewport.
266|- Preserve owner-only Personal logic.
267|
268|Breakpoint should follow existing desktop behavior (`lg`) unless app-shell testing proves another breakpoint necessary.
269|
270|## 7. Active State Rules
271|
272|Route matching must use longest-prefix behavior already present.
273|
274|Examples:
275|
276|- `/app/projects` and `/app/projects/[id]` activate `Proyek` and parent `Pekerjaan`.
277|- `/app/clients/[id]` activates `Klien` and parent `Pekerjaan`.
278|- `/app/tasks` activates `Tugas` and parent `Pekerjaan`.
279|- `/app/invoices/[id]` activates `Invoice` and parent `Keuangan`.
280|- `/app/brain` activates `Asisten` and parent `AI`.
281|
282|Parent active treatment:
283|
284|- expanded sidebar: purple-tinted surface or current active parent token
285|- collapsed sidebar: active icon surface
286|- active remains visible when flyout closed
287|
288|Do not mark direct `Waktu`, `Kalender`, or `File` under Pekerjaan.
289|
290|Hidden Sales routes remain hidden and must not open unrelated groups.
291|
292|## 8. Badge Behavior
293|
294|### Child badges
295|
296|- `Tugas`: numeric `myOpenTasks`, cap at `99+`.
297|- `Invoice`: numeric `unpaidInvoices`, cap at `99+`.
298|- Existing localized accessible badge labels remain.
299|
300|### Parent badges
301|
302|When child badge count > 0 and flyout is closed:
303|
304|- use a small semantic dot on Pekerjaan/Keuangan parent
305|- accessible label may say `Memiliki tugas terbuka` or `Memiliki invoice belum dibayar`
306|- do not show summed numeric parent badge
307|
308|Do not duplicate numeric announcements to screen readers when panel is open.
309|
310|## 9. Localization
311|
312|All group, child, description, tooltip, and accessibility copy follows current ID/EN state.
313|
314|Suggested descriptions:
315|
316|### ID
317|
318|- Klien: `Kelola relasi, data, dan portal klien`
319|- Proyek: `Pantau pekerjaan dan progres proyek`
320|- Tugas: `Lihat tugas terbuka dan prioritas`
321|- Invoice: `Kelola tagihan dan status pembayaran`
322|- Service: `Atur layanan dan harga`
323|- Pengeluaran: `Catat biaya operasional`
324|- Laporan: `Lihat ringkasan performa`
325|- Asisten: `Tanya dan cek data workspace`
326|- Prompt Studio: `Buat materi campaign dengan AI`
327|
328|### EN
329|
330|Provide equivalent concise copy. No mixed-language panel.
331|
332|Mobile accordion may omit descriptions to stay compact. Desktop flyout may show them.
333|
334|## 10. Accessibility & Keyboard Contract
335|
336|Follow a disclosure navigation pattern. Do not overuse `role="menu"` if arrow-key menu behavior is not fully implemented. Preferred accessible baseline:
337|
338|- parent `<button>` with `aria-expanded` and `aria-controls`
339|- flyout as labeled navigation region/list
340|- children remain standard `<Link>` elements
341|
342|Keyboard behavior:
343|
344|- `Tab`: visits parents and links in document order.
345|- `Enter`/`Space`: opens or toggles parent.
346|- `ArrowRight`: opens flyout and focuses first child when parent focused.
347|- `ArrowDown`: optionally opens/focuses first child.
348|- `ArrowUp/Down`: moves between child links when flyout focus is inside.
349|- `ArrowLeft` or `Escape`: closes and returns focus to parent.
350|- Focus leaving parent+panel closes unpinned flyout.
351|
352|Requirements:
353|
354|- visible focus rings
355|- active and expanded states do not rely on color alone
356|- no keyboard trap
357|- no inaccessible hover-only content
358|- reduced-motion support
359|- correct accessible names in ID/EN
360|
361|## 11. Data Model & Component Refactor
362|
363|Replace flat `navItems` plus inferred grouping with a typed navigation tree.
364|
365|Recommended shape:
366|
367|```ts
368|type DirectNavItem = {
369|  kind: "direct";
370|  id: string;
371|  href: string;
372|  icon: LucideIcon;
373|  label: LocalizedText;
374|  badgeKey?: SidebarBadgeKey;
375|  ownerOnly?: boolean;
376|};
377|
378|type NavGroup = {
379|  kind: "group";
380|  id: "work" | "finance" | "personal" | "ai";
381|  icon: LucideIcon;
382|  label: LocalizedText;
383|  children: DirectNavItem[];
384|  ownerOnly?: boolean;
385|};
386|```
387|
388|Recommended component split:
389|
390|```text
391|src/components/app-sidebar.tsx
392|src/components/sidebar/sidebar-nav.tsx
393|src/components/sidebar/sidebar-direct-item.tsx
394|src/components/sidebar/sidebar-group-trigger.tsx
395|src/components/sidebar/sidebar-flyout.tsx
396|src/components/sidebar/sidebar-mobile-accordion.tsx
397|src/lib/navigation/app-navigation.ts
398|src/lib/navigation/app-navigation.test.ts
399|```
400|
401|A smaller split is acceptable, but avoid adding all flyout/timer/focus logic into the already large `app-sidebar.tsx`.
402|
403|Keep one navigation registry shared by:
404|
405|- expanded desktop
406|- collapsed desktop
407|- mobile accordion
408|- active-route helper
409|- badge helper
410|- localization
411|
412|Do not maintain three separate route lists.
413|
414|## 12. State Model
415|
416|Suggested state:
417|
418|```ts
419|type SidebarGroupId = "work" | "finance" | "personal" | "ai";
420|
421|const [hoveredGroup, setHoveredGroup] = useState<SidebarGroupId | null>(null);
422|const [pinnedGroup, setPinnedGroup] = useState<SidebarGroupId | null>(null);
423|const [mobileGroup, setMobileGroup] = useState<SidebarGroupId | null>(null);
424|```
425|
426|Effective desktop group:
427|
428|```ts
429|const openDesktopGroup = pinnedGroup ?? hoveredGroup;
430|```
431|
432|Use refs for open/close timers. Always clear timers on unmount and route change.
433|
434|Do not persist transient hover state. Persisting pinned group is optional and not required for first release.
435|
436|## 13. Permission & Route Safety
437|
438|- Keep Personal owner-only filtering before rendering triggers or children.
439|- Do not change route authorization; sidebar visibility is not authorization.
440|- Preserve hidden Sales routes.
441|- Do not infer permissions only from client state.
442|- Child links must point to exact existing routes.
443|- External content cannot control navigation configuration.
444|
445|## 14. Implementation Phases
446|
447|### Phase A — Navigation registry
448|
449|1. Add typed tree registry.
450|2. Add ID/EN labels and descriptions.
451|3. Add active-route helper with tests.
452|4. Add owner-only filtering and badge derivation.
453|5. Preserve all current routes.
454|
455|**Acceptance:** registry produces correct visible groups for owner/member/viewer and correct active parent/child for nested routes.
456|
457|### Phase B — Desktop expanded and collapsed flyout
458|
459|1. Build group trigger.
460|2. Build positioned flyout.
461|3. Add delayed hover open/close.
462|4. Add click pin/toggle and outside/Escape close.
463|5. Add collapsed-group behavior without competing tooltip.
464|6. Add active states and notification dots.
465|
466|**Acceptance:** users can reliably move cursor into flyout without it disappearing; every item works by mouse and keyboard.
467|
468|### Phase C — Mobile accordion
469|
470|1. Render same registry as accordion at `<lg`.
471|2. Auto-open active route group.
472|3. Close mobile sidebar after child navigation.
473|4. Preserve direct Waktu/Kalender/File items.
474|5. Verify touch targets and owner filtering.
475|
476|**Acceptance:** no hover dependency and no viewport overflow on 375px/390px.
477|
478|### Phase D — Visual polish and localization
479|
480|1. Apply reference-inspired white panel, soft shadow, 12px radius.
481|2. Add concise descriptions desktop only.
482|3. Complete ID/EN copy and accessible labels.
483|4. Verify active/hover/focus/expanded states.
484|5. Respect reduced motion.
485|
486|### Phase E — QA and non-regression
487|
488|1. Test all routes and nested active states.
489|2. Test all roles.
490|3. Test expanded/collapsed/mobile.
491|4. Test badges.
492|5. Test keyboard and pointer delay behavior.
493|6. Verify no layout shift, clipping, or horizontal overflow.
494|7. Verify production remains untouched.
495|
496|## 15. Test Plan
497|
498|### Unit tests
499|
500|- Registry contains each route exactly once.
501|- Work children are Klien, Proyek, Tugas.
502|- Waktu, Kalender, File remain direct items.
503|- Owner sees Personal; member/viewer do not.
504|- Nested path maps to correct parent and child.
505|- Hidden Sales route maps to no visible group.
506|- Badge values cap at `99+`.
507|- Parent dot derives correctly without numeric aggregation.
508|- ID/EN labels exist for every visible item.
509|
510|### Component tests
511|
512|- Hover opens after configured delay.
513|- Brief pointer leave does not close before cursor reaches panel.
514|- Click pins/unpins.
515|- Outside click and Escape close.
516|- Opening another group closes previous group.
517|- Collapsed mode opens flyout and suppresses duplicate tooltip.
518|- Active parent stays highlighted with panel closed.
519|- Mobile tap expands accordion, not flyout.
520|- Mobile child navigation closes sidebar.
521|- Keyboard opens, traverses, and closes panel.
522|- Personal never renders for unauthorized roles.
523|
524|### Authenticated E2E on dev
525|
526|Use approved QA credentials without printing them.
527|
528|Desktop 1440×1000:
529|
530|1. Open/close every flyout by hover.
531|2. Pin every flyout by click.
532|3. Navigate to every child.
533|4. Verify active parent/child on nested client/project/invoice routes.
534|5. Collapse sidebar and repeat navigation.
535|6. Verify task and invoice badges.
536|
537|Desktop 1280×800:
538|
539|- Verify panel vertical clamping and no clipping.
540|
541|Mobile 390×844 and 375×812:
542|
543|1. Open sidebar.
544|2. Expand every accordion.
545|3. Navigate every child.
546|4. Verify direct Waktu/Kalender/File remain one tap.
547|5. Verify no horizontal overflow.
548|6. Verify active group auto-opens.
549|
550|Roles:
551|
552|- owner: Personal visible
553|- member/viewer: Personal absent
554|
555|Production guard:
556|
557|- production image ID unchanged
558|- production container `StartedAt` unchanged
559|- no production build/recreate/deploy
560|
561|## 16. Visual Acceptance
562|
563|Desktop expanded:
564|
565|- sidebar visibly shorter and calmer than current state
566|- flyout width 260–300px
567|- parent-child hierarchy clear
568|- active route obvious
569|- panel does not feel like generic tooltip
570|
571|Desktop collapsed:
572|
573|- icons remain understandable
574|- flyout is stable
575|- no tooltip overlap
576|
577|Mobile:
578|
579|- accordion hierarchy clear
580|- no side flyout
581|- no clipped children
582|- sidebar remains easy to dismiss
583|
584|Screenshots required:
585|
586|- desktop expanded, flyout closed
587|- Pekerjaan flyout open
588|- Keuangan flyout open
589|- collapsed sidebar with flyout
590|- mobile Pekerjaan accordion
591|- nested active child state
592|
593|## 17. Quality Gates
594|
595|Run targeted tests during implementation, then:
596|
597|```bash
598|npm run lint
599|npx tsc --noEmit
600|npm test
601|npm run build
602|```
603|
604|Run full build once after batch completes, not after each HMR change.
605|
606|## 18. Definition of Done
607|
608|- Sidebar uses compact top-level structure.
609|- Pekerjaan contains Klien, Proyek, Tugas.
610|- Waktu, Kalender, File remain direct.
611|- Keuangan, Personal, AI use flyouts desktop and accordions mobile.
612|- Hover has delay; click pin/toggle works.
613|- No hover tunnel failure in E2E/manual QA.
614|- Collapsed desktop works without duplicate tooltip.
615|- Parent and child active states work on nested routes.
616|- Task/invoice child badges remain; parent uses dot only.
617|- Owner-only Personal behavior preserved.
618|- ID/EN copy complete.
619|- Keyboard/accessibility contract passes.
620|- No route or authorization behavior changes.
621|- Desktop/mobile screenshots approved on dev.
622|- Lint, TypeScript, tests, build pass.
623|- Production untouched until Alip explicitly approves.
624|
625|## 19. Coder Guardrails
626|
627|1. Read `AGENTS.md`, workflow plan, hardening plan, and this plan first.
628|2. Check git status and preserve concurrent/untracked work.
629|3. Implement only on dev; do not deploy production.
630|4. Do not put Proyek/Tugas under Klien.
631|5. Do not use hover-only interaction.
632|6. Do not use desktop flyout on mobile.
633|7. Do not hide Waktu behind a group.
634|8. Do not duplicate navigation registries.
635|9. Do not weaken route authorization.
636|10. Test expanded, collapsed, mobile, keyboard, badges, nested routes, and roles.
637|
638|## 20. Suggested Coder Prompt
639|
640|```text
641|Implement docs/plans/sidebar-flyout-navigation-plan.md in /root/projects/cubicle.
642|
643|Read first:
644|- AGENTS.md
645|- docs/dev-production-workflow-plan.md
646|- docs/architecture-security-hardening-plan.md
647|- docs/plans/sidebar-flyout-navigation-plan.md
648|
649|Follow phases A–E. Preserve unrelated work. Work only on dev.cubiqlo.com and do not deploy production. Replace flat sidebar density with typed navigation tree: Pekerjaan contains Klien/Proyek/Tugas; Waktu/Kalender/File stay direct; Keuangan/Personal/AI become desktop flyouts and mobile accordions. Desktop must support delayed hover plus click pinning, collapsed mode, keyboard navigation, active nested routes, and badge dots. Preserve owner-only Personal and all route authorization. Run targeted tests, lint, TypeScript, full tests, build, authenticated desktop/mobile/role QA, and verify production runtime remained untouched. Return changed files, real test output, screenshots, known limitations, and exact dev URL.
650|```
651|