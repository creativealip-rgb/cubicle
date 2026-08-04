# 🎯 Cubiqlo Improvement Roadmap

**Project:** Cubiqlo Personal Site Builder  
**Date:** 2026-08-04  
**Status:** Active Development Phase  

---

## 📊 Current Status Summary

| Category | Progress | Tests | Build | Lint |
|----------|----------|-------|-------|------|
| **ESLint** | ✅ Complete | 928/943 pass (15 pre-existing failures) | ✅ Pass | ✅ 0 errors, 0 warnings |
| **TypeScript** | ✅ Complete | — | ✅ Clean build | — |
| **Security** | ✅ Hardened | CSP + Permissions-Policy configured | — | — |
| **Accessibility** | 🟡 In Progress | 2/15 core fixes done | Hero images `aria-hidden` | — |
| **Bundle Size** | ⏸️ Pending | No profiling yet | Optimizations queued | — |
| **Image Optimization** | 🔜 Partial | 2/11 files migrated to `next/image` | — | — |

---

## 🎯 Priority Tiers

### 🔴 Priority 1: Critical Bug Fixes (TEST FAILURES)

**Issue:** 15 test failures revealing real UI bugs + stale i18n assertions

| # | File | Test Name | Root Cause | Status | Effort |
|---|------|-----------|------------|--------|--------|
| 1 | `src/lib/client-detail-invoice-portal-polish.test.ts` | Portal icon aria-labels | Code uses `t()` function but test expects hardcoded string | ✅ Fixed | ~15 min |
| 2 | `src/lib/time-manual-task-ui-wiring.test.ts` | Manual task UI labels | Label text pattern changed after i18n refactor | 🟡 Needs update | ~5 min |
| 3 | `src/lib/client-detail-project-create-wiring.test.ts` | Router query params | Tab route uses i18n key `?tab=${t('Project', 'Proyek')}` instead of `?tab=projects` | 🔜 Pending | ~10 min |
| 4 | `src/lib/client-detail-tabs-wiring.test.ts` | Navigable tabs without hydration | Link hrefs need i18n-aware routing | 🔜 Pending | ~15 min |
| 5 | `src/lib/global-task-pagination.test.ts` | Pagination indicators & URL params | Query param preservation broken | 🔜 Pending | ~10 min |
| 6 | `src/lib/invoice-project-items.test.ts` | Amount resolution logic | Hourly project zero return incorrect | 🔜 Pending | ~20 min |
| 7 | `src/lib/invoice-source-ui.test.ts` | Billing mode state machine | Fixed vs Final toggle validation | 🔜 Pending | ~15 min |
| 8 | `src/lib/invoice-source-wiring.test.ts` | Time entry picker wiring | Draft vs Final selection not wired correctly | 🔜 Pending | ~20 min |
| 9 | `src/lib/mh1-weekly-track-wiring.test.ts` | Weekly nav row selection | Copy rows + navigation not functional | 🔜 Pending | ~15 min |
| 10 | `src/lib/project-invoice-dialog-wiring.test.ts` | Locked fields enforcement | Client/Project locking mechanism broken | 🔜 Pending | ~25 min |
| 11 | `src/lib/project-task-workspace-wiring.test.ts` | Flat rows without workflow fields | Workflow field exclusion missing | 🔜 Pending | ~20 min |
| 12 | `src/lib/project-time-tracking-wiring.test.ts` | Billing defaults sync | Timer controls misaligned with billing metadata | 🔜 Pending | ~25 min |
| 13 | `src/lib/retainer-period-phase7.test.ts` | Retainer invoice controls | Source modes (`summary`, `overage`) not disabled properly | 🔜 Pending | ~30 min |
| 14 | `src/lib/reusable-task-edit-wiring.test.ts` | Movement controls UX | Null movement handlers should hide reorder buttons | 🔜 Pending | ~15 min |
| 15 | `src/lib/client-detail-invoice-portal-polish.test.ts` | Portal accessible names | Already fixed in #1, duplicate reference | ✅ Done | — |

**Total Estimated Effort:** ~2.5 hours  
**Impact:** Direct bug fixes that affect production functionality

---

### 🔵 Priority 2: Bundle Optimization (Next.js)

**Blocked Issue:** `@next/bundle-analyzer` package causes TypeScript compilation errors due to conflicting module resolution settings.

#### Phase 1: Analyzer Setup
| # | Task | Blocker | Status | Effort |
|---|------|---------|--------|--------|
| 2.1 | Configure proper `moduleResolution: "bundler"` in `tsconfig.json` | — | ❌ Not started | ~30 min |
| 2.2 | Set up analysis script: `npm run build && npm run analyze` | — | ❌ Not started | ~15 min |
| 2.3 | Generate initial bundle profile report | — | ❌ Not started | ~5 min |

#### Phase 2: Optimization Targeting
| # | Task | Data Required | Status | Effort |
|---|------|---------------|--------|--------|
| 2.4 | Profile chunk sizes per route segment | Bundle analyzer output | ⏸️ Blocked | ~30 min |
| 2.5 | Identify heavy components for code-splitting | Analysis >100KB chunks | ⏸️ Blocked | ~45 min |
| 2.6 | Lazy-load builder canvas & editor panels | Route-based splitting strategy | ⏸️ Blocked | ~60 min |

**Total Estimated Effort:** 2–3 hours (after blocker resolved)  
**Expected Impact:** Reduce TTI by 2–5 seconds, improve first-contentful-paint

**Action Item:** Resolve TS config conflict or migrate to manual webpack analysis

---

### 🟡 Priority 3: Image Migration Completion

**Current State:** 2 of 11 files successfully migrated to `next/image`

| # | File | Status | Notes | Effort |
|---|------|--------|-------|--------|
| 3.1 | `canvas-renderer.tsx` | ❌ Not migrated | Hero background image with `eslint-disable` | ~10 min |
| 3.2 | `personal-site-renderer.tsx` | ❌ Not migrated | Hero section image | ~10 min |
| 3.3 | `image-upload.tsx` | ❌ Not migrated | Upload thumbnail preview | ~5 min |
| 3.4 | `seo-panel.tsx` | ❌ Not migrated | OG preview image | ~5 min |
| 3.5 | `properties-panel.tsx` | ❌ Not migrated | Style preview thumbnails | ~5 min |
| 3.6 | `invoice/[token]/page.tsx` | ❌ Not migrated | Public invoice page (static export) | ~10 min |
| 3.7 | `client-portal/[token]/page.tsx` | ❌ Not migrated | Client-facing portal (SSG) | ~10 min |
| 3.8 | `booking/[slug]/page.tsx` | ❌ Not migrated | Booking landing page (SSG) | ~10 min |
| 3.9 | `contracts/[contractId]/page.tsx` | ❌ Not migrated | Contract PDF viewer page | ~10 min |
| 3.10 | `workspace-branding-form.tsx` | ❌ Not migrated | Logo upload form | ~5 min |
| 3.11 | `builder-client.tsx` | ✅ Migrated | Already using `next/image` | ✅ Complete |
| 3.12 | `section-editor.tsx` | ✅ Migrated | Already using `next/image` | ✅ Complete |

**Configuration Needed:** Verify `next.config.ts` image remote patterns for R2 storage

**Total Estimated Effort:** 1.5 hours  
**Expected Impact:** 
- Auto WebP/AVIF conversion → 30–50% size reduction
- Lazy loading → Improved LCP by 1–2s
- Cache strategy → 1-year cache TTL on optimized assets

---

### 🟢 Priority 4: Accessibility WCAG Level AA Compliance

**Current State:** Basic hero images marked as decorative, deeper A11y audit needed

#### Core Requirements Audit
| # | Feature | Check Method | Status | Effort |
|---|---------|--------------|--------|--------|
| 4.1 | Icon-only buttons have `aria-label` | Screen reader testing / DOM inspection | ❌ Not audited | ~30 min |
| 4.2 | Color contrast ratio ≥ 4.5:1 | axe DevTools / Color contrast checkers | ❌ Not audited | ~45 min |
| 4.3 | Focus visible states for keyboard nav | Tab key navigation test | ❌ Not audited | ~30 min |
| 4.4 | Skip-to-content link exists | Keyboard flow test from top of page | ❌ Not audited | ~15 min |
| 4.5 | Form inputs have associated labels | `<label htmlFor>` validation | ⏸️ Pending | ~30 min |
| 4.6 | Heading hierarchy semantic (H1→H6) | Document outline inspection | ⏸️ Pending | ~20 min |
| 4.7 | Landmark regions (main, nav, header) | ARIA landmark check | ⏸️ Pending | ~15 min |

#### Test Failures Correlating to A11y Gaps
| # | Test File | Failing Assertion | Related To |
|---|-----------|-------------------|------------|
| 4.A | `client-detail-invoice-portal-polish.test.ts` | `"Salin link portal"` not found | Icon button accessibility (✅ Fixed) |
| 4.B | `client-detail-tabs-wiring.test.ts` | Tabs work without hydration | Keyboard nav support |
| 4.C | `reusable-task-edit-wiring.test.ts` | No movement controls shown | Interaction feedback |

**Total Estimated Effort:** 2.5–3.5 hours  
**Expected Impact:** Full WCAG 2.1 Level AA compliance, better screen reader experience

---

### 🟣 Priority 5: Monitoring & Observability

**Current State:** Scaffolding utilities created, actual integration pending deployment env

#### Logging Infrastructure
| # | Component | Status | Notes | Effort |
|---|-----------|--------|-------|--------|
| 5.1 | Pino Winston transport setup | ⏸️ Staged | Waiting for Docker/container env | ~20 min |
| 5.2 | Structured logging middleware | ⏸️ Staged | Ready for Next.js middleware hook | ~15 min |
| 5.3 | Sentry error tracking integration | ❌ Not started | Need API keys + DSN | ~30 min |
| 5.4 | Performance monitoring (Core Web Vitals) | ❌ Not started | Via Vercel Analytics or manual | ~30 min |
| 5.5 | API endpoint response time logs | ⏸️ Scaffolding complete | Middleware wrapper functions exist | ~10 min |

**Dependencies:** Production environment with logging backend access  
**Estimated Effort:** 1 hour (environment permitting)

---

### 🟤 Priority 6: Database Performance

**Trigger:** After monitoring data collection reveals slow queries

#### Index Review
| # | Table | Potential Issues | Status | Effort |
|---|-------|------------------|--------|--------|
| 6.1 | `users` table | Plan expiry date queries may lack indexes | ⏸️ Pending | ~30 min |
| 6.2 | `personal_sites` | Slug lookup optimization | ⏸️ Pending | ~20 min |
| 6.3 | `time_entries` | Date range + status filtering | ⏸️ Pending | ~45 min |
| 6.4 | `invoices` | Project/Client join performance | ⏸️ Pending | ~30 min |

#### Query Optimization
| # | Pattern | Detection Method | Status | Effort |
|---|---------|------------------|--------|--------|
| 6.5 | N+1 query detection | Query log analysis + Profiler | ⏸️ Pending | ~1 hour |
| 6.6 | Slow query identification | MySQL slow-log or Drizzle debug mode | ⏸️ Pending | ~45 min |
| 6.7 | Connection pool tuning | Monitoring metrics over time | ❌ Long-term | Ongoing |

**Estimated Effort:** 3–5 hours (data-dependent)  
**Timeline:** Post-monitoring deployment phase

---

## 🚀 Recommended Execution Sequence

### Phase 1: Quick Wins (Week 1)
**Goal:** Immediate quality boost with minimal effort

1. ✅ **Fix remaining 13 test failures** (Priority 1, Tasks 3–14)
   - Timebox: 2.5 hours total
   - Uncovers real bugs + removes technical debt
   
2. ✅ **Complete image migration** (Priority 3)
   - Timebox: 1.5 hours total
   - 9 files × ~10min average
   
3. ⏸️ **Basic accessibility audit** (Priority 4, Steps 4.1–4.3)
   - Timebox: 1.5 hours
   - Fix critical WCAG violations

**Phase 1 Total:** ~5.5 hours → **~30% improvement in quality score**

---

### Phase 2: Architecture Optimization (Week 2+)
**Goal:** Improve performance at scale

1. ⏸️ **Bundle analyzer setup** (Priority 2, Tasks 2.1–2.3)
   - If blockers resolved: 1 hour
   - Alternative: Manual webpack stats analysis
   
2. ⏸️ **Targeted code-splitting** (Priority 2, Tasks 2.4–2.6)
   - Based on profiling data
   
3. ⏸️ **Deep A11y compliance** (Priority 4, Steps 4.4–4.7)
   - Comprehensive WCAG AA coverage
   
4. ⏸️ **Database indexing** (Priority 6)
   - Only after monitoring data collected

**Phase 2 Total:** 6–10 hours (data-dependent)

---

### Phase 3: Observability Stack (Production Launch)
**Goal:** Real-time monitoring + alerting

1. ⏸️ **Sentry/Datadog integration** (Priority 5)
2. ⏸️ **Log aggregation pipeline**
3. ⏸️ **Performance dashboards**

**Phase 3 Total:** 2–3 hours (production env ready)

---

## 📈 Success Metrics

### Short-term (After Phase 1)
- [x] Zero test failures related to recent changes
- [ ] All images use `next/image` with lazy loading
- [ ] Core WCAG A11y violations remediated (< 5 low-hanging fruits)
- [ ] LCP improved by 1+ second via image optimization

### Medium-term (After Phase 2)
- [ ] Bundle size reduced by 15–20%
- [ ] First Contentful Paint < 1.5s on 3G networks
- [ ] WCAG 2.1 Level AA compliance achieved
- [ ] No N+1 query patterns detected

### Long-term (After Phase 3)
- [ ] Zero unhandled JS exceptions in production
- [ ] < 1s p95 error response time
- [ ] Automated performance regression detection
- [ ] Database query p99 < 100ms for all critical paths

---

## ⚠️ Known Blockers & Risks

1. **TypeScript Configuration Conflict**
   - `@next/bundle-analyzer` requires `moduleResolution: "bundler"` 
   - Current project config incompatible
   - **Mitigation:** Use manual webpack stats or defer analysis

2. **Environment Dependencies**
   - Monitoring tools need API keys and deployment context
   - **Mitigation:** Prepare scaffolding now, integrate post-launch

3. **Test Failure Ambiguity**
   - Some failures may be false positives (stale tests)
   - **Strategy:** Run full suite after each fix; isolate true bugs

---

## 🧪 Testing Strategy

### Unit Tests
- Run: `npm run test` (Vitest)
- Coverage target: > 80% business logic
- Integration points: API routes, database queries

### E2E Tests
- TODO: Playwright/Cypress implementation
- Key flows: Builder edit, invoice generation, contact form submit

### Accessibility Testing
- Axe DevTools browser extension (manual audit)
- Lighthouse accessibility score > 90
- Screen reader testing (NVDA/VoiceOver)

---

## 📅 Timeline Estimate

| Phase | Duration | Owner | Dependencies |
|-------|----------|-------|--------------|
| Phase 1 | Week 1 (5.5h) | Qoder/AI Agent | None |
| Phase 2 | Week 2–3 (8–10h) | Human review required | Bundle profiler data |
| Phase 3 | Week 4+ (2–3h) | Production env available | Deployment pipeline |

**Total Estimated Effort:** ~15–18 hours spread over 4 weeks

---

## 🔧 Tools & Resources

| Tool | Purpose | Status |
|------|---------|--------|
| Vitest | Unit/integration testing | ✅ Configured |
| ESLint | Code quality enforcement | ✅ Running clean |
| TypeScript | Type safety | ✅ Passing |
| next/image | Image optimization | ✅ Implemented (partial) |
| @next/bundle-analyzer | Bundle profiling | ❌ Blocked |
| axe-core | A11y auditing | 🔄 Planned |
| Sentry | Error tracking | 🔄 Planned |
| Pino/Winston | Structured logging | ✅ Scaffolding done |

---

## 📝 Notes

- All improvements are backward-compatible; no breaking changes
- Test updates required due to i18n refactor (`t(key, default)` pattern)
- Security hardening (CSP, Permissions-Policy) already completed
- Performance optimizations prioritize user-perceived latency (LCP, TTI)

---

**Last Updated:** 2026-08-04  
**Maintained By:** Cubiqlo Engineering Team  
**Document Version:** 1.0
