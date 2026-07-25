# Cubiqlo Reports Simplification Design

**Date:** 2026-07-25  
**Status:** Approved  
**Target:** `src/app/(app)/app/reports/page.tsx`

## Objective

Make Reports answer one question within seconds: how much money came in, went out, and remained during the selected period.

Primary audience: freelancers and small service businesses. Cubiqlo remains a project/service-management product, not a full accounting suite.

## Product Decisions

- Default period: current month.
- Primary metrics: income received, expenses paid/recorded, and net.
- Receivables and forecasts are supporting analysis, not equal-weight headline KPIs.
- Summary is visible first; advanced analysis uses progressive disclosure.
- Operational create actions remain in global navigation and entity pages.
- Workspace base currency and manual FX conversion remain supported.

## Page Structure

### 1. Header and report controls

Header contains:

- Title: `Laporan`
- Subtitle: `Ringkasan pemasukan dan pengeluaran bisnismu.`
- Period selector
- Export action

Period presets:

- Current month, selected by default
- Previous month
- Current quarter
- Current year
- Custom date range

Remove `Invoice baru` and `Catat pengeluaran` from the report header. They duplicate global and entity-page actions.

Period must be represented in URL search parameters so selection remains shareable and browser navigation works.

### 2. Primary summary

Display three equal-weight KPI cards:

1. `Pemasukan`
2. `Pengeluaran`
3. `Bersih`

Definitions:

- Income uses payments received inside selected period, not invoice face value.
- Expenses use expense dates inside selected period.
- Net equals converted income minus converted expenses.
- Each metric compares against immediately preceding equivalent period when comparison data exists.
- Net may show margin percentage when income is above zero.

All values use workspace base currency after valid manual FX conversion. Missing-rate currencies are excluded and surfaced in one warning above metrics.

### 3. Income versus expense chart

One combined chart replaces separate six-month KPI totals and current horizontal P&L rows.

Behavior:

- Current or previous month: group by week.
- Quarter or year: group by month.
- Custom period: choose day, week, or month based on range length.
- Income and expenses use grouped bars.
- Hover/focus exposes exact values.
- Empty periods remain visible to preserve temporal context.
- Chart includes a concise accessible data summary for screen readers.

### 4. Breakdown section

Two cards on desktop, stacked on mobile.

#### Income sources

- Rank clients by payments received in selected period.
- Show top five clients.
- Show payment count and converted total.
- Use `Lihat semua pemasukan` for drill-down.
- Do not use invoiced totals because they conflict with cash-based headline income.

#### Largest expenses

- Rank categories by expenses in selected period.
- Show top five categories.
- Show amount and percentage of period expenses.
- Use `Lihat semua pengeluaran` for drill-down.

Both cards must follow active period and currency conversion rules.

### 5. Receivables requiring attention

Merge collection health, outstanding AR, invoice-aging summary, and overdue detail into one supporting card.

Visible summary:

- Total unpaid
- Total overdue
- Invoice count
- Up to three most urgent overdue invoices
- `Lihat semua invoice` action

Urgency order: highest days overdue first, then earliest due date.

Amounts display original currency for individual invoices and base-currency equivalent when conversion exists. Aggregate totals include only convertible amounts. Missing FX uses existing warning behavior.

Detailed aging buckets move under advanced analysis.

### 6. Advanced analysis

Collapsed section labeled `Analisis lainnya`:

- Cash-flow forecast
- Expenses by project
- Invoice aging

Opening the section reveals existing analysis without making initial page long. Advanced components follow current language, currency, and data-access rules.

## Information Removed or Merged

- Remove six-month fixed period from headline cards.
- Remove separate `Kesehatan penagihan` KPI.
- Replace YTD-only top clients with period-aware payment sources.
- Merge duplicate overdue and outstanding representations.
- Remove repeated technical copy such as `setara IDR` from every row. Explain conversion once near report controls or warning.
- Hide advanced tables until requested.

## Responsive Design

### Desktop

- Three KPI cards in one row.
- Full-width chart.
- Income and expense breakdown cards in two columns.
- Receivables full width.

### Mobile at 390px

- Header controls wrap into a two-column action row.
- KPI cards stack vertically.
- Chart remains horizontally contained; no page-level overflow.
- Breakdown cards stack.
- Receivable metrics use two columns and wrap the third item as needed.
- Tables inside advanced analysis use mobile cards or contained horizontal scrolling where conversion is out of scope.
- Interactive targets are at least 40px tall.

## States

Each section handles:

- Success with data
- Empty data with concise explanation and relevant destination link
- Missing FX warning without crashing unrelated sections
- Invalid period parameters by normalizing to current month

Because page is a server component, loading feedback should use the route-level loading state or skeleton matching KPI/chart shape if period navigation causes visible delay.

## Data Integrity

- Never sum raw mixed currencies.
- Conversion uses workspace base currency and configured manual FX rates.
- Net only uses successfully converted income and expense values.
- Income means actual payments during period.
- Receivables do not count as income until paid.
- Breakdown totals must reconcile with headline totals for same filters.
- Advanced analysis must not silently change accounting basis.

## Accessibility

- Period control has explicit label.
- Chart colors are not sole distinction; legend and accessible labels identify series.
- Positive/negative state includes text or sign, not color alone.
- Links use descriptive labels.
- Collapsible advanced section exposes `aria-expanded` state.
- Keyboard focus remains visible.

## Verification

1. Type-check with `npx tsc --noEmit`.
2. Run production build.
3. Verify current-month default with no period query.
4. Verify previous-month, quarter, year, and custom ranges.
5. Reconcile KPI totals against payments and expenses queries.
6. Verify multi-currency workspace with configured and missing FX rates.
7. Verify no-data workspace and period with zero activity.
8. Test desktop and real 390×844 viewport.
9. Confirm no horizontal page overflow.
10. Confirm advanced analysis is collapsed initially and keyboard accessible.
11. Confirm links preserve relevant filters when target pages support them.

## Scope Boundaries

Included:

- Information architecture and presentation changes on Reports
- Period-aware calculations and comparisons
- Existing advanced analysis moved behind progressive disclosure

Excluded:

- Full bookkeeping reports
- Balance sheet, general ledger, tax reports, and bank reconciliation
- Automatic market FX feeds
- New accounting database model
- Customizable user-arranged dashboard widgets

## Approved Visual Direction

Approved option A mockup: `.superpowers/report-option-a.html`.

Production implementation should follow the existing Cubiqlo design system rather than copy mockup CSS directly.
