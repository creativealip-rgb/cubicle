1|# Cubiqlo Prompt Studio — UX & Prompt Catalog Redesign Plan
2|
3|**Tanggal:** 26 Juli 2026
4|**Status:** Approved planning handoff; implementation pending
5|**Target environment:** `https://dev.cubiqlo.com` only until Alip approves production release
6|**Scope:** Prompt Studio UI, prompt catalog, dynamic brief schema, generation contract, result presentation, history drawer, tests
7|**Out of scope:** Production deploy, payment/plan redesign, AI provider replacement, DB migration unless proven necessary
8|
9|## 1. Objective
10|
11|Redesign `/app/prompts` from a dense technical prompt generator into a guided content-creation workflow that answers:
12|
13|1. What do I want to create?
14|2. What brief does Cubiqlo need?
15|3. What result can I use now?
16|
17|Success means a new user can choose a content type, complete a short brief, generate a focused result, copy it, and find prior generations without understanding AI prompt terminology.
18|
19|## 2. Current Problems
20|
21|Verified on desktop and mobile using the QA account on `dev.cubiqlo.com`:
22|
23|- Two stacked navigation layers compete: category tabs and mode tabs.
24|- Tokens/cost/generation cards dominate the first fold.
25|- Eight fields appear at once regardless of content type.
26|- `Generate AI` sits in the output panel instead of after the brief.
27|- A technical draft prompt appears before generation and looks like final output.
28|- History renders as a long full-width section below the editor.
29|- Defaults are a GoldHeritage jewelry demo, making the feature feel unfinished.
30|- Backend output contract is mostly universal even when each content type needs different output.
31|- Existing mode names describe internal/technical concepts rather than user goals.
32|
33|## 3. Product Principles
34|
35|1. Organize by desired result, not AI engine.
36|2. Use category → content type → brief → result.
37|3. One generation should solve one primary job.
38|4. Show four core brief fields first; disclose specialist fields only when needed.
39|5. Default result is human-ready content; technical prompt is secondary.
40|6. Format/ratio is a field, never a top-level prompt type.
41|7. History stays accessible without occupying the creation workspace.
42|8. Preserve current workspace access checks, monthly cost cap, activity logging, and DB history.
43|9. Do not expose model names, tokens, raw provider errors, or internal engine wording in primary UX.
44|10. Mobile flow is sequential, not a squeezed desktop grid.
45|
46|## 4. Information Architecture
47|
48|### 4.1 Launch catalog: 15 prompt types
49|
50|#### Social Media
51|
52|1. `instagram-feed` — **Feed Instagram**
53|   Result: visual concept, image prompt, overlay text, caption, CTA, hashtags.
54|2. `carousel` — **Carousel**
55|   Result: 3–10 slide structure, slide copy, visual direction, caption, CTA.
56|3. `story` — **Story**
57|   Result: 1–5 frames, headline, visual direction, interaction suggestion, CTA.
58|4. `content-series` — **Content Series**
59|   Result: 3/6/9-post campaign, role of each post, visual system, captions, schedule suggestion.
60|
61|#### Iklan & Promosi
62|
63|5. `product-ad` — **Iklan Produk**
64|   Result: headline, subheadline, visual prompt, offer treatment, CTA, negative prompt.
65|6. `promo-discount` — **Promo & Diskon**
66|   Result: price hierarchy, promo badge, urgency copy, CTA, layout direction.
67|7. `testimonial-review` — **Testimonial & Review**
68|   Result: proof angle, quote hierarchy, review layout, supporting copy, CTA.
69|
70|#### Produk
71|
72|8. `product-photography` — **Product Photography**
73|   Result: scene, camera, lighting, background, product treatment, negative prompt.
74|9. `product-try-on` — **Product Try-On**
75|   Result: model profile, pose, styling, product placement, camera/lighting, consistency notes.
76|10. `fnb-menu` — **Menu F&B**
77|    Result: menu hierarchy, food photography prompt, item copy, price treatment, CTA.
78|
79|#### Video
80|
81|11. `short-video-script` — **Short Video Script**
82|    Result: hook, script, shot list, overlay, B-roll, CTA.
83|12. `video-storyboard` — **Video Storyboard**
84|    Result: scene-by-scene duration, visual, camera, VO, overlay, transition, audio mood.
85|13. `ugc-ad` — **UGC Ad**
86|    Result: natural hook, problem, demo, proof, objection handling, CTA script.
87|14. `youtube-thumbnail` — **YouTube Thumbnail**
88|    Result: subject, expression, composition, 3–5-word text, contrast treatment, negative prompt.
89|
90|#### Brand & Copy
91|
92|15. `marketing-copy` — **Marketing Copy**
93|    User first selects one output: caption, ad copy, product description, headline set, CTA set, or broadcast message. Do not generate all formats by default.
94|
95|### 4.2 Post-launch catalog; do not show at launch
96|
97|- Marketplace Banner
98|- Event & Launch
99|- Product Catalog
100|- Campaign Idea
101|- Brand Voice
102|- Logo Brief
103|- Visual Identity Board
104|
105|Keep these in a documented backlog or disabled catalog entries only if implementation benefits. Do not render "Coming soon" clutter.
106|
107|### 4.3 Remove/rename old modes
108|
109|- `Design Grafis` → `Iklan Produk`
110|- `9 Feed Konsisten` → `Content Series`, selectable 3/6/9
111|- `Copy Writing` → `Marketing Copy`, one chosen output
112|- `Review Produk` → `Testimonial & Review`
113|- `Logo Produk` → remove from launch; future `Logo Brief`
114|- `Face Card Analysis` → remove from launch; future personal-style template if validated
115|- `Typography Ads` → absorb into `Iklan Produk` style/creative-direction field
116|
117|Existing historical generations must remain readable. No destructive migration of old input JSON is required.
118|
119|## 5. New User Flow
120|
121|### Step 1 — Choose category
122|
123|Header copy:
124|
125|- Title: `Prompt Studio`
126|- Subtitle: `Buat materi campaign dari brief sederhana.`
127|
128|Category controls:
129|
130|- Social Media
131|- Iklan & Promosi
132|- Produk
133|- Video
134|- Brand & Copy
135|
136|Only prompt types from selected category render below. Do not show all 15 simultaneously.
137|
138|### Step 2 — Choose content type
139|
140|Each option is a compact selectable row/card with:
141|
142|- icon
143|- human name
144|- one-line outcome
145|- no ratio badge
146|- clear selected state
147|
148|Example:
149|
150|```text
151|Carousel
152|Konten 3–10 slide dengan copy dan arahan visual.
153|```
154|
155|### Step 3 — Complete brief
156|
157|Core fields shown by default:
158|
159|1. Brand
160|2. Product / campaign
161|3. Goal
162|4. Audience
163|
164|Do not prefill GoldHeritage. Use placeholders:
165|
166|- Brand: `Contoh: Cubiqlo`
167|- Product/campaign: `Contoh: Aplikasi pengelolaan klien untuk freelancer`
168|- Goal: `Contoh: Mendorong pendaftaran akun gratis`
169|- Audience: `Contoh: Freelancer Indonesia yang kewalahan mengelola banyak klien`
170|
171|`Advanced options` disclosure contains applicable optional fields such as offer, style, ratio/platform, color palette, tone, notes.
172|
173|Dynamic specialist fields render from selected prompt type; see section 6.
174|
175|Primary button sits after brief:
176|
177|```text
178|Generate Materi
179|```
180|
181|Button requirements:
182|
183|- full-width on mobile
184|- prominent purple primary
185|- disabled until required fields are valid
186|- loading copy: `Menyusun materi…`
187|- no double submission
188|
189|### Step 4 — Result
190|
191|Before generation, show an empty state:
192|
193|```text
194|Hasil akan muncul di sini
195|Pilih jenis konten, isi brief, lalu generate materi.
196|```
197|
198|Never expose the generated draft/system prompt before generation.
199|
200|After generation show two views:
201|
202|1. `Hasil Siap Pakai` — default; human-readable output.
203|2. `Prompt Teknis` — secondary; only when a technical image/video prompt exists.
204|
205|Actions:
206|
207|- Copy
208|- Edit brief
209|- Generate ulang
210|
211|Copy gives visible success feedback. Generated result remains on screen after `router.refresh()`.
212|
213|### Step 5 — History
214|
215|Move history into a right-side drawer on desktop and full-height sheet on mobile.
216|
217|Trigger:
218|
219|```text
220|Riwayat
221|```
222|
223|History row displays:
224|
225|- content-type name, derived from stored input when available
226|- brand/campaign title
227|- localized date
228|- optional small cost metadata
229|- short output preview
230|
231|Do not show provider model badge in default row. Put tokens/model/cost in optional details.
232|
233|Selecting history loads a read-only result view. Deletion requires a confirmation dialog and item-specific loading state.
234|
235|## 6. Dynamic Brief Contract
236|
237|### 6.1 Shared fields
238|
239|```ts
240|type PromptBrief = {
241|  promptType: PromptTypeId;
242|  brand: string;
243|  campaign: string;
244|  goal: string;
245|  audience: string;
246|  offer?: string;
247|  tone?: string;
248|  style?: string;
249|  platform?: string;
250|  ratio?: string;
251|  colorPalette?: string;
252|  notes?: string;
253|  options: Record<string, string | number | boolean>;
254|  model?: string;
255|};
256|```
257|
258|Required globally: `promptType`, `brand`, `campaign`, `goal`, `audience`.
259|
260|Server validation must discriminate by `promptType`; do not trust client-only validation.
261|
262|### 6.2 Type-specific fields
263|
264|- Feed Instagram: platform, ratio, tone.
265|- Carousel: slide count 3–10, educational/promotional intent.
266|- Story: frame count 1–5, interaction type, ratio fixed/default 9:16.
267|- Content Series: post count 3/6/9, publishing cadence.
268|- Iklan Produk: offer, placement/platform, ratio.
269|- Promo & Diskon: normal price, promo price, end date/period, terms.
270|- Testimonial & Review: quote/proof source, rating optional, product/service context. Never invent a testimonial.
271|- Product Photography: scene preset, camera angle, lighting, background.
272|- Product Try-On: product category, model profile, pose, styling.
273|- Menu F&B: item/menu name, price visibility, cuisine/venue mood.
274|- Short Video Script: platform, duration, presenter/faceless, tone.
275|- Video Storyboard: duration, scene count, orientation, VO language.
276|- UGC Ad: platform, duration, creator profile, objection, proof available.
277|- YouTube Thumbnail: video topic/title, subject, face/no-face, text preference.
278|- Marketing Copy: exactly one `copyFormat`, desired length, tone, channel.
279|
280|### 6.3 Registry, not condition sprawl
281|
282|Create one typed catalog module, recommended:
283|
284|```text
285|src/lib/prompts/catalog.ts
286|src/lib/prompts/types.ts
287|src/lib/prompts/build-prompt.ts
288|```
289|
290|Each catalog entry owns:
291|
292|- id
293|- category
294|- name
295|- description
296|- icon key
297|- defaults
298|- field definitions
299|- output contract
300|
301|UI and server prompt builder consume the same registry where safe. Server keeps authoritative validation/output instructions.
302|
303|## 7. AI Generation Contract
304|
305|Current backend forces nearly the same six outputs for every mode. Replace it with prompt-type-specific instructions.
306|
307|### Required behavior
308|
309|- System prompt remains Indonesian-first and production-oriented.
310|- User prompt includes only fields relevant to selected type.
311|- Output contract changes by type.
312|- Do not instruct `10 variations`, `7 slides`, `8 scenes`, or `9 posts` unless user chose those quantities.
313|- Do not invent prices, testimonials, statistics, ingredients, product claims, guarantees, or deadlines.
314|- Mark missing factual proof as `[BUTUH DATA]` rather than fabricating it.
315|- Keep output focused and token-efficient.
316|- Hide model/provider details from normal user output.
317|- Preserve monthly cap check, usage storage, activity log, workspace authorization, and API key handling.
318|
319|### Structured output recommendation
320|
321|Prefer versioned JSON from AI where feasible:
322|
323|```ts
324|type PromptGenerationResult = {
325|  version: 1;
326|  promptType: PromptTypeId;
327|  title: string;
328|  readyOutput: Array<{
329|    label: string;
330|    content: string;
331|  }>;
332|  technicalPrompt?: string;
333|  negativePrompt?: string;
334|  notes?: string[];
335|};
336|```
337|
338|Parse and validate server-side with Zod. Store a readable fallback string only if provider output cannot be parsed. UI must handle both new structured generations and legacy text generations.
339|
340|If structured output creates unacceptable provider instability, retain text storage for this sprint but use explicit section markers and add a parser. Do not block UX redesign on perfect JSON reliability.
341|
342|## 8. UI Layout
343|
344|### Desktop
345|
346|Use two-stage workspace, not three equal dense columns:
347|
348|```text
349|Header: title + compact usage + History trigger
350|Category/content picker
351|Main grid: Brief (minmax 360–440px) | Result (remaining width)
352|```
353|
354|History opens as drawer. This preserves room for result content.
355|
356|### Mobile
357|
358|Sequential flow:
359|
360|```text
361|Header
362|Horizontally scrollable categories
363|Content-type list
364|Brief
365|Sticky or directly adjacent Generate button
366|Result
367|```
368|
369|History opens as full-height sheet. Usage summary collapses to one line or tooltip.
370|
371|### Usage display
372|
373|Replace three metric cards with compact copy:
374|
375|```text
376|8 generasi bulan ini · $0.0068 digunakan
377|```
378|
379|Token count and monthly cap belong in tooltip/details. Keep currency formatting readable and spaced correctly.
380|
381|### Visual direction
382|
383|- Preserve Cubiqlo purple/navy design system.
384|- Avoid gradient orbs, glassmorphism, nested cards, and generic AI sparkles everywhere.
385|- One clear purple primary action.
386|- Brief area may use subtle slate surface; result reads like a document/editor.
387|- Selected prompt type must use more than color: border/ring + check/icon.
388|- Keep touch targets at least 44px on mobile.
389|- Visible keyboard focus and associated labels required.
390|
391|## 9. File-Level Implementation Map
392|
393|Expected primary files:
394|
395|- `src/app/(app)/app/prompts/page.tsx`
396|  - simplify header and usage summary
397|  - remove inline full history card
398|  - pass generations/usage to redesigned studio
399|- `src/components/prompts/auto-feeds-studio.tsx`
400|  - likely replace/rename with a composed studio shell
401|- New recommended components:
402|  - `src/components/prompts/prompt-studio.tsx`
403|  - `src/components/prompts/category-picker.tsx`
404|  - `src/components/prompts/content-type-picker.tsx`
405|  - `src/components/prompts/dynamic-brief-form.tsx`
406|  - `src/components/prompts/prompt-result.tsx`
407|  - `src/components/prompts/prompt-history-drawer.tsx`
408|- `src/components/prompts/prompt-history.tsx`
409|  - refactor for drawer/list behavior and legacy support
410|- `src/lib/actions/visual-prompts.ts`
411|  - discriminated validation
412|  - prompt-type-specific generation contract
413|  - structured output parser/fallback
414|- `src/lib/actions/prompts.ts`
415|  - confirm list query returns stored `input` needed for type/brand/campaign labels
416|- `src/lib/prompts/*`
417|  - typed registry, schema, prompt builder
418|- Tests under `src/lib/prompts/*.test.ts` and relevant component/E2E paths.
419|
420|Do not add a DB migration unless current `prompt_generations.input` JSONB and output columns cannot support the design. Existing schema appears sufficient.
421|
422|## 10. State and Compatibility Requirements
423|
424|- Preserve all old generations.
425|- Legacy records lacking `promptType` display as `Prompt lama` or mapped from old `mode`.
426|- Switching category/type asks before discarding a generated result or materially edited brief.
427|- Form state stays while history drawer opens/closes.
428|- Generate errors show human Indonesian copy; do not dump full upstream response.
429|- Result is not lost after route refresh.
430|- Empty/loading/error/success states required.
431|- Delete spinner is scoped to selected history row, not every delete button.
432|
433|## 11. Implementation Phases
434|
435|### Phase A — Catalog and contract
436|
437|1. Add typed catalog and prompt IDs.
438|2. Add discriminated Zod input validation.
439|3. Add type-specific prompt builders.
440|4. Add unit tests for all 15 prompt types.
441|5. Preserve old action compatibility only as needed during UI transition.
442|
443|**Acceptance:** every type builds correct instructions and rejects invalid specialist fields.
444|
445|### Phase B — Studio shell and brief flow
446|
447|1. Build category and content-type picker.
448|2. Build four-field core brief.
449|3. Build advanced and dynamic fields.
450|4. Move primary action after brief.
451|5. Remove demo defaults and raw draft preview.
452|
453|**Acceptance:** new user can reach generate without seeing irrelevant controls.
454|
455|### Phase C — Result experience
456|
457|1. Add empty/loading/error/success states.
458|2. Render ready output and optional technical prompt separately.
459|3. Add Copy/Edit brief/Generate ulang.
460|4. Ensure generation survives refresh/state update.
461|
462|**Acceptance:** output is understandable without reading prompt syntax.
463|
464|### Phase D — History and usage
465|
466|1. Move history to drawer/sheet.
467|2. Derive human labels from generation input.
468|3. Add legacy fallback.
469|4. Add delete confirmation and row-scoped loading.
470|5. Compress usage cards to one-line summary.
471|
472|**Acceptance:** main workspace stays short and history remains fully usable.
473|
474|### Phase E — Responsive and accessibility QA
475|
476|1. Verify desktop at 1440×1000 and 1280×800.
477|2. Verify mobile at 390×844 and 375×812.
478|3. Verify keyboard navigation, focus, labels, scroll overflow, and 200% zoom.
479|4. Verify no horizontal page overflow.
480|5. Run authenticated full workflow on dev.
481|
482|## 12. Test Plan
483|
484|### Unit tests
485|
486|- Catalog has exactly 15 unique launch IDs.
487|- Every category has at least one type.
488|- Every type defines required fields and output contract.
489|- Carousel rejects slide count outside 3–10.
490|- Story rejects frame count outside 1–5.
491|- Content Series accepts only 3/6/9.
492|- Marketing Copy requires exactly one copy format.
493|- Promo generation does not fabricate absent price/deadline.
494|- Testimonial generation marks missing proof instead of inventing it.
495|- Prompt builders include relevant fields and exclude irrelevant fields.
496|- Legacy mode mapping works.
497|- Structured result parser handles valid output and text fallback.
498|
499|### Component/integration tests
500|
501|- Category selection filters content types.
502|- Type selection changes dynamic fields.
503|- Advanced fields start collapsed.
504|- Generate disabled until required core fields valid.
505|- One submit per click.
506|- Successful generation renders `Hasil Siap Pakai`.
507|- Technical prompt tab only appears when available.
508|- Copy feedback appears.
509|- History drawer preserves brief state.
510|- Delete confirmation and scoped loading work.
511|
512|### Authenticated E2E on dev
513|
514|Using QA credentials from approved secret/user input, without printing them:
515|
516|1. Login.
517|2. Open `/app/prompts`.
518|3. Generate one Social Media Carousel with 5 slides.
519|4. Verify 5 slide sections, copy action, and history entry.
520|5. Generate one Marketing Copy output and verify only selected format returns.
521|6. Test mobile category scroll, brief, generation, result, and history sheet.
522|7. Verify workspace authorization and monthly cap behavior remain active.
523|8. Verify production image/container/start timestamp remain unchanged.
524|
525|Avoid repeated real AI calls in automated test suites. Mock provider responses for tests; use at most one cheap real generation for final dev smoke.
526|
527|## 13. Quality Gates
528|
529|Before requesting review:
530|
531|```bash
532|npm run lint
533|npx tsc --noEmit
534|npm test
535|npm run build
536|```
537|
538|Also run targeted tests first during iteration. Full production build runs once after the batch is complete, not after every UI edit.
539|
540|Visual evidence required:
541|
542|- desktop screenshot before/after
543|- mobile screenshot before/after
544|- first fold
545|- brief with advanced options closed/open
546|- generated result
547|- history drawer/sheet
548|
549|## 14. Definition of Done
550|
551|- Five categories and 15 launch prompt types implemented.
552|- Old confusing modes removed or mapped for history compatibility.
553|- Four core fields shown by default.
554|- Specialist fields change by selected type.
555|- GoldHeritage defaults removed.
556|- `Generate Materi` sits after brief.
557|- No raw draft prompt shown before generation.
558|- Result separates ready output from technical prompt.
559|- History moved to drawer/sheet.
560|- Usage compressed.
561|- Desktop/mobile/authenticated flows pass.
562|- Legacy history remains readable.
563|- Authorization, monthly cap, cost tracking, and activity log unchanged.
564|- Lint, TypeScript, tests, and build pass.
565|- Changes verified on `dev.cubiqlo.com`.
566|- Production not deployed until Alip explicitly approves.
567|
568|## 15. Coder Guardrails
569|
570|1. Read `AGENTS.md`, `docs/dev-production-workflow-plan.md`, and `docs/architecture-security-hardening-plan.md` first.
571|2. Run `git status --short --branch`; preserve unrelated work.
572|3. Develop only against isolated `dev.cubiqlo.com` and dev DB.
573|4. Do not edit old applied migrations.
574|5. Do not deploy production.
575|6. Do not expose credentials/provider keys in logs, screenshots, commits, or responses.
576|7. Keep current access control and usage cap logic.
577|8. Prefer typed registry + discriminated schemas over a large `if/else` component.
578|9. Test behavior, not only screenshots.
579|10. Stop and report if required changes conflict with canonical workflow or another agent's dirty files.
580|
581|## 16. Suggested Coder Task Prompt
582|
583|```text
584|Implement docs/plans/prompt-studio-redesign-plan.md in /root/projects/cubicle.
585|
586|Mandatory first reads:
587|- AGENTS.md
588|- docs/dev-production-workflow-plan.md
589|- docs/architecture-security-hardening-plan.md
590|- docs/plans/prompt-studio-redesign-plan.md
591|
592|Follow phases A–E. Preserve unrelated changes and existing generation history. Work only on dev.cubiqlo.com with isolated dev data. Do not deploy production. Keep workspace authorization, monthly cap, usage storage, and activity logging intact. Use typed catalog/discriminated validation, dynamic fields, human-ready output, history drawer, and mobile sequential flow. Run targeted tests during work, then lint, TypeScript, full tests, build, authenticated desktop/mobile dev QA, and verify production runtime stayed untouched. Return changed files, test output, screenshots, known limitations, and exact dev URL.
593|```
594|