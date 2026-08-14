# Cubiqlo UI Phase 0 Evidence Manifest

**Captured:** 12 Agustus 2026  
**Runtime:** `https://dev.cubiqlo.com`  
**Source revision:** `main@44a9c32ef58b03f8f83b4d32f63dbf1544b03b0d`  
**Dev revision:** `dev/integration@b211a50b74ce08a077d8c9a7b37785cf09bc8813`  
**Role:** owner  
**Locale:** ID  
**Account:** redacted  
**State ceiling:** current populated/account-visible state only

| Route | Role | Locale | Viewport | State | Revision | Screenshot | Console/HTTP | Issue |
|---|---|---|---|---|---|---|---|---|
| `/app/dashboard` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_dashboard.png`<br>`tablet-app_dashboard.png`<br>`mobile-app_dashboard.png`<br>`short-mobile-app_dashboard.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM |
| `/app/reports` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_reports.png`<br>`tablet-app_reports.png`<br>`mobile-app_reports.png`<br>`short-mobile-app_reports.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM |
| `/app/projects` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_projects.png`<br>`tablet-app_projects.png`<br>`mobile-app_projects.png`<br>`short-mobile-app_projects.png` | desktop:200, tablet:200, mobile:502, short-mobile:200; captured console errors: 1 | duplicate current navigation entries present in DOM<br>transient HTTP 502; immediate manual retry returned 200; retry not represented as a separate capture |
| `/app/time` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_time.png`<br>`tablet-app_time.png`<br>`mobile-app_time.png`<br>`short-mobile-app_time.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM |
| `/app/invoices` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_invoices.png`<br>`tablet-app_invoices.png`<br>`mobile-app_invoices.png`<br>`short-mobile-app_invoices.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM |
| `/app/calendar` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_calendar.png`<br>`tablet-app_calendar.png`<br>`mobile-app_calendar.png`<br>`short-mobile-app_calendar.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM |
| `/app/files` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_files.png`<br>`tablet-app_files.png`<br>`mobile-app_files.png`<br>`short-mobile-app_files.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM |
| `/app/tasks` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_tasks.png`<br>`tablet-app_tasks.png`<br>`mobile-app_tasks.png`<br>`short-mobile-app_tasks.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM |
| `/app/settings` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_settings.png`<br>`tablet-app_settings.png`<br>`mobile-app_settings.png`<br>`short-mobile-app_settings.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | No route-specific issue captured; duplicate current-nav DOM remains global. |
| `/app/personal` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_personal.png`<br>`tablet-app_personal.png`<br>`mobile-app_personal.png`<br>`short-mobile-app_personal.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | duplicate current navigation entries present in DOM<br>horizontal overflow: document 1069px > viewport 1024px |
| `/app/docs` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_docs.png`<br>`tablet-app_docs.png`<br>`mobile-app_docs.png`<br>`short-mobile-app_docs.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | No route-specific issue captured; duplicate current-nav DOM remains global. |
| `/app/whats-new` | owner | ID | desktop/tablet/mobile/short-mobile | Current populated/account-visible | `b211a50` | `desktop-app_whats-new.png`<br>`tablet-app_whats-new.png`<br>`mobile-app_whats-new.png`<br>`short-mobile-app_whats-new.png` | desktop:200, tablet:200, mobile:200, short-mobile:200; captured console errors: 0 | No route-specific issue captured; duplicate current-nav DOM remains global. |

## State Coverage

| State | Result | Reason / next proof |
|---|---|---|
| Populated/current | Exercised | Current owner workspace data rendered on all 12 routes and four viewports. |
| Empty | Not exercised | Read-only baseline did not mutate QA data. Use deterministic fixture or existing empty workspace during owning page batch. |
| Loading | Not exercised | Capture did not intercept/delay requests. Exercise on changed async surfaces during owning batch. |
| Error | Not exercised | No safe fault injection during read-only capture. Exercise recoverable errors for changed async surfaces during owning batch. |
| Permission/disabled | Not exercised | Only owner role captured. Use viewer/member QA account when shared controls or permission presentation changes. |
| Long content | Partially exercised | Current content heights captured; no synthetic long-content fixture. Add where changed layout can wrap/clip. |

## Evidence Notes

- 48 screenshots exist: 12 routes × 4 viewports.
- `runtime.json` carries per-capture role, locale, state, revision, screenshot path, console errors, geometry, and issue classification.
- `/app/projects` mobile records original transient `502`; immediate retry returned `200`, but retry was not saved as a separate machine-result row.
- `/app/personal` tablet records confirmed horizontal overflow: `1069px > 1024px`.
- Duplicate current navigation entries appear because desktop/mobile copies remain in DOM; Batch A must correct accessibility-current semantics.
- Account identifier redacted. No credential stored.
