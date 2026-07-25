# Dependency Security Audit — 25 July 2026

## Result

`npm audit` changed from 21 high findings to 16 high findings after safe patch-level upgrades:

- `better-auth` 1.6.18 → 1.6.22, fixing GHSA-qq9h-g4jm-xgf3 pre-account hijacking.
- `postcss` 8.5.15 → 8.5.18, fixing GHSA-r28c-9q8g-f849 source-map path traversal.

Production-only audit changed to 9 high findings. No critical findings remain.

## Residual findings

### ExcelJS archive chain — production

Packages: `exceljs`, `archiver`, `archiver-utils`, `zip-stream`, `readdir-glob`, `glob`, `minimatch`, `brace-expansion`, and `rimraf`.

Current Cubiqlo usage creates XLSX workbooks from authenticated workspace database rows and calls `workbook.xlsx.writeBuffer()`. It does not parse user-provided XLSX/archive input through ExcelJS. This makes archive/glob denial-of-service advisories less directly reachable, but the dependency debt remains open.

npm proposes downgrading `exceljs` 4.4.0 to 4.1.1. That is not accepted: it is a backwards downgrade, not a trustworthy patched release path, and can regress exports. Replace ExcelJS or upgrade when upstream publishes a compatible fixed chain.

### ESLint chain — development only

Residual findings in ESLint plugins/config and glob/minimatch tooling are not present in the production-only dependency surface. npm proposes incompatible major/downgrade changes, including ESLint 10 and unrelated old `eslint-config-next` releases. Do not run `npm audit fix --force`.

## Verification

Fresh after upgrade:

- `npm run lint`: exit 0.
- `npx tsc --noEmit`: exit 0.
- `npm test`: 32 files, 205 tests passed.
- `npm run build`: exit 0, Next.js 16.2.11 production build completed.
- `npm ls better-auth postcss --all`: Better Auth 1.6.22 and PostCSS 8.5.18 resolved throughout relevant chains.

## Follow-up trigger

Re-audit when any of these occurs:

1. Better Auth, Next.js, Tailwind, ESLint, or ExcelJS is upgraded.
2. Cubiqlo starts importing/parsing XLSX supplied by users.
3. ExcelJS publishes a compatible release with a repaired archive dependency chain.
4. Export generation becomes exposed without authentication or bounded workspace queries.

Residual audit findings are tracked debt, not evidence that every route is remotely exploitable.
