# Cubiqlo Final Billing, Storage, Document Sending, and Landing Plan

> **Status:** Canonical product decision and implementation handoff.
>
> **Environment:** Dev first. Production requires explicit approval.

**Goal:** Menyatukan keputusan final billing, storage, document sending, landing page, verification, dan deployment Cubiqlo tanpa bergantung pada catatan chat atau plan lama.

**Source of truth:** Dokumen ini supersedes pricing, workspace/member limits, storage quota, add-on, dan document-send decisions yang lebih lama. Historical plan tetap dipertahankan sebagai arsip, bukan sumber requirement aktif.

---

## 1. Final Product Decisions

### 1.1 Plans

| Plan | Monthly | Yearly | Base storage | Workspace | Member |
|---|---:|---:|---:|---:|---:|
| Free Forever | Rp0 | Rp0 | 1 GB/workspace | 1 | Tidak bisa invite |
| Solo | Rp75.000 | Rp900.000 | 5 GB/workspace | Existing Solo rule | Existing Solo rule |
| Team | Rp165.000 | Rp1.980.000 | 5 GB/workspace | 3 | 5/workspace |

Pricing copy:

```text
Rp75.000/month
Billed yearly: Rp900.000/year
```

```text
Rp165.000/month
Billed yearly: Rp1.980.000/year
```

Rules:

- Monthly dan yearly adalah billing period terpisah.
- Plan expiry mengikuti period.
- Existing grace-period behavior tetap berlaku.
- Team tidak unlimited workspace/member.
- Owner dihitung sebagai member.
- Pending invite harus reserve member slot.

### 1.2 Storage model

Quota mengikuti workspace aktif.

```text
Quota owner: workspace
Usage scope: seluruh file di workspace
```

Base quota:

- Free: 1 GB/workspace.
- Solo: 5 GB/workspace.
- Team: 5 GB/workspace.

Rules:

- Client portal upload masuk quota workspace.
- Tidak ada client-specific quota.
- Semua upload path memakai guard yang sama.
- Upload baru diblokir jika quota baru terlampaui.
- Penurunan quota tidak menghapus file.
- Existing files tetap dapat dibaca/dihapus.
- File usage dihitung dari record `files.size_bytes`.
- Reservation mencegah concurrent upload melewati quota.

Upload paths:

- normal workspace upload
- drag/drop upload melalui normal upload route
- client portal file upload
- client portal request upload
- direct/API upload jika ada
- direct `completeUpload`

UI target:

```text
Storage used: 1.2 GB / 5 GB
Available: 3.8 GB
```

### 1.3 Storage add-ons

| Add-on | Harga bulanan |
|---|---:|
| +5 GB | Rp10.000 |
| +10 GB | Rp20.000 |
| +15 GB | Rp30.000 |

Rules:

- Add-on dibeli per user.
- Add-on tersedia di seluruh workspace yang user miliki/ikuti.
- Add-on mengikuti period plan.
- Auto-renew mengikuti plan.
- Cancel berlaku akhir periode.
- Add-on cumulative.
- Quota turun tidak menghapus file.
- Add-on entitlement harus idempotent terhadap webhook/payment replay.

Yearly add-on pricing:

- Harga yearly = harga bulanan × 12.
- Contoh `+5 GB yearly = Rp120.000/year`.

### 1.4 Extra workspace

```text
+1 workspace: Rp30.000/month
```

Rules:

- Hanya Team yang dapat membeli extra workspace.
- Extra workspace mengikuti billing period Team.
- Yearly = Rp360.000/year.
- Auto-renew mengikuti plan.
- Cancel berlaku akhir periode.
- Entitlement menambah workspace slot, bukan mengubah base Team limit.

### 1.5 Document sending

Applicable documents:

- Proposal
- Contract
- Questionnaire

Flow:

```text
Edit → Preview → Confirm send → Email → Sent
```

Rules:

- Owner/member dengan akses dokumen boleh mengirim.
- Viewer tidak boleh mengirim.
- Tidak perlu status review tambahan.
- Preview dan confirmation wajib sebelum send.
- Button disable saat sending.
- Server-side row lock/conditional status guard wajib.
- Double-send race harus ditolak atau menjadi idempotent.
- Recipient dan subject harus terlihat sebelum confirm.
- Activity log wajib.
- Resend tersedia.
- Email failure harus tampil sebagai error.
- Email failure tidak boleh menyimpan status sukses.
- Contract digital signature existing dipertahankan.

Contract audit flow:

```text
generate contract
→ preview
→ send email
→ client buka
→ client sign
→ status tersimpan
→ audit/activity log
```

### 1.6 Email

Provider aktif: Resend.

Audit scope:

- sender domain
- recipient
- Reply-To
- provider error handling
- verification email
- resend verification
- reset-password email
- no API key/error leakage ke UI
- real delivery test ke `myvaword@gmail.com`

Provider tidak diganti.

### 1.7 Landing page

- Default language: English.
- ID/EN tersedia seperti dashboard.
- Navbar punya language switch.
- Selected language dipersist.
- Login button mengikuti bahasa aktif.
- Mobile navbar harus diuji.
- Metadata/OG language harus konsisten.
- Pricing/limit copy harus mengikuti tabel final di dokumen ini.
- Tidak boleh menampilkan `Unlimited users` atau `Unlimited workspaces` untuk Team.

### 1.8 Calendar

Calendar revision scope: skipped.

### 1.9 Deployment

Allowed without production approval:

- coding
- tests
- build
- migration ke dev
- deploy dev
- dev browser QA

Production deploy, restart, routing change, atau migration production membutuhkan approval eksplisit.

---

## 2. Current Implementation Status

### Completed

- Canonical base plan prices in `src/lib/billing-plans.ts`.
- Monthly/yearly checkout period.
- Billing period persisted in `pakasir_payments`.
- Webhook expiry follows billing period.
- Order ID collision protection.
- Team max 3 workspaces.
- Team max 5 members/workspace.
- Base workspace quota: Free 1 GB, Solo 5 GB, Team 5 GB.
- Workspace storage reservation model.
- Transaction-aware quota executor.
- Normal upload quota wiring.
- Client portal upload quota wiring.
- Direct `completeUpload` quota guard.
- R2 cleanup on upload failure.
- Proposal/contract/questionnaire email sending via existing Resend helper.
- Document send row locks and email-failure handling.
- Dev migration applied.
- Dev deploy at `https://dev.cubiqlo.com`.
- Dev health and routed HTTP verified.

### Dev evidence

```text
Dev commit: ac7df41
Dev health: {"status":"ok","db":"ok"}
Dev HTTP: 200
DB: cubicle_dev
Migration tables: user_storage_addons, workspace_storage_usage
Migration column: pakasir_payments.billing_period
```

Focused source gate:

```text
8 test files passed
60 tests passed
```

Production status:

```text
Not deployed.
```

---

## 3. Remaining Implementation Work

### P0 — Add-on billing

1. Add storage add-on checkout endpoint.
2. Validate catalog key against `STORAGE_ADDONS`.
3. Support monthly/yearly amount calculation.
4. Create provider order with unique order ID.
5. Persist pending payment with entitlement type.
6. Handle verified Pakasir webhook.
7. Create `user_storage_addons` only once.
8. Use provider order/event ID uniqueness for idempotency.
9. Add active add-on list endpoint/action.
10. Add cancel-at-period-end action.
11. Add auto-renew path.
12. Add expiry cleanup path.
13. Add tests for replay, renewal, cancel, and quota drop.

### P0 — Extra workspace billing

1. Add extra-workspace checkout.
2. Add entitlement storage.
3. Enforce Team-only purchase.
4. Count base slots plus active extra slots.
5. Enforce cancellation at period end.
6. Add webhook idempotency.
7. Test creation at slot boundary and downgrade behavior.

### P1 — Storage UI

1. Add shared usage query/action.
2. Display usage on File page.
3. Display active add-ons and expiry.
4. Display available storage.
5. Display quota-block error in ID/EN.
6. Test usage after normal upload.
7. Test usage after portal upload.
8. Test over-quota state after cancellation.

### P1 — Canonical quota cleanup

1. Remove redundant legacy quota calculation from upload paths.
2. Make `storage-quota.ts` the single source of truth.
3. Ensure base quota and add-ons are calculated in one service.
4. Ensure all direct file inserts are guarded or intentionally excluded.
5. Add reconciliation command/job for `files` vs reservation state.

### P1 — Auth/email verification

1. Test reset email delivery to `myvaword@gmail.com`.
2. Test valid reset token.
3. Test expired token.
4. Test reused token.
5. Test password persistence/login.
6. Test verification email URL uses correct app URL.
7. Test resend verification.
8. Check server logs redact provider secrets.

### P1 — Landing/i18n

1. Replace stale Team copy in `src/app/page.tsx`.
2. Add final storage/member/workspace copy.
3. Add navbar language switch.
4. Persist selected language.
5. Make login CTA language-aware.
6. Test mobile navbar.
7. Test EN default.
8. Test ID switch.
9. Verify metadata/OG.

### P1 — Documentation reconciliation

Update stale historical docs or mark them explicitly as superseded:

- `docs/cubicle_remaining_plan.md`
- `docs/cubicle_plan.md`
- relevant meeting plan sections

Do not rewrite historical evidence. Add a clear pointer to this canonical plan and mark old pricing/limits as historical.

### P2 — TSC cleanup

Known pre-existing error:

```text
e2e/production-qa-time.spec.ts(32,21)
```

Fix separately or document as accepted baseline exception. Do not hide new TypeScript errors behind this exception.

---

## 4. Verification Matrix

| Area | Required evidence |
|---|---|
| Free | 1 workspace, 1 GB, invite blocked |
| Solo | monthly/yearly prices, 5 GB quota |
| Team | 3 workspace, 5 members/workspace, 5 GB/workspace |
| Add-on | checkout, webhook, active entitlement, renewal, cancel |
| Extra workspace | Team-only, slot increase, renewal, cancel |
| Upload | all routes, atomic reservation, cleanup |
| Quota | concurrent upload cannot exceed limit |
| Billing | period amount and expiry match |
| Auth | reset + verification real delivery |
| Proposal | preview, confirm, send, resend, failure |
| Contract | send, sign, status, audit log |
| Questionnaire | preview, confirm, send, failure |
| i18n | ID/EN dialogs and messages |
| Landing | EN default, switcher, login CTA, mobile |
| Migration | backup, restore test, correct DB, privileges |
| Dev | health, HTTP, image revision, DB health |
| Production | only after explicit approval |

---

## 5. Release Gates

### Gate A — Source

```bash
git diff --check
npx vitest run <tracked focused suites>
npx tsc --noEmit
npm run build
```

Known TSC baseline exception must be reported separately.

### Gate B — Dev migration

1. Confirm `current_database() = cubicle_dev`.
2. Create `pg_dump -Fc`.
3. Record SHA-256.
4. Restore-test dump into disposable DB.
5. Apply migration.
6. Verify tables, columns, constraints, indexes.
7. Verify app role privileges.

### Gate C — Dev deploy

1. Use clean `dev/integration` worktree.
2. Ensure local SHA equals `origin/dev/integration`.
3. Run `PRE_DEPLOY_CHECK.sh`.
4. Confirm `dokploy-traefik` owns 80/443.
5. Build image with VCS revision.
6. Verify health and DB.
7. Verify production container unchanged.

### Gate D — Browser QA

Run on dev only:

- auth reset/verification
- billing toggle
- quota upload
- portal upload
- add-on UI/entitlement
- proposal send
- contract sign
- questionnaire send
- landing language switch
- mobile navbar

### Gate E — Production

Blocked until:

- Gate A PASS.
- Gate B PASS.
- Gate C PASS.
- Gate D PASS.
- Add-on and extra workspace lifecycle complete.
- Explicit approval received.

---

## 6. Supersession Rule

When a historical document conflicts with this file:

1. Use this file for active implementation.
2. Keep historical document unchanged when it records past work.
3. Add a pointer to this file when editing historical docs.
4. Never reuse old pricing or `unlimited` Team limits.
5. Update implementation/tests before updating marketing copy.

**Final active status — session handoff 2026-08-11:** Dev deployed and healthy at `https://dev.cubiqlo.com`; production untouched and blocked. Source/build/migration gates pass. Storage add-on and extra-workspace lifecycle, checkout owner/origin guards, payment-status UI, Pakasir missed-webhook sync, reconciliation scheduler, add-on purchase UI, and document preview-confirm flow are implemented. Document dialog browser QA passed 18/18 with fixture cleanup verified in DB. Real provider payment/webhook and real email delivery remain open.

### Session handoff — resume here

Completed evidence:

- Focused source tests: latest landing copy test `2 passed`; broader billing/storage batch previously `29 tests passed`.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Dev DB: `cubiqlo-new-pg/cubicle_dev`; migrations 0070–0073 applied.
- Dev backup + restore-test completed; backup SHA-256 recorded in session log.
- Dev container `cubicle-dev`: healthy; `/api/health` returns `{"status":"ok","db":"ok"}`.
- Landing dev browser: HTTP 200; EN copy, ID switch, cookie persistence, desktop no-overflow verified.
- Persistent dev browser QA: workspace upload and portal upload passed with UI + DB + reload + UI cleanup proof; proposal, questionnaire, and contract draft CRUD passed with DB + reload + UI cleanup proof; questionnaire delete UI added because detail route lacked cleanup control.
- Dev storage UI now shows bilingual available-storage value; dev R2 empty environment overrides removed from `docker-compose.dev.yml`; metadataBase now follows `NEXT_PUBLIC_APP_URL`, verified dev `og:url=https://dev.cubiqlo.com`.
- Latest focused wiring tests: 30/30 passed; latest dev rebuild healthy; `dokploy-traefik` remains sole public 80/443 owner; production container unchanged.
- Email/reset/verification/send/sign and payment-provider runtime QA remain intentionally on hold/open.

Status snapshot 2026-08-11:
- PASS: source/build/TSC, storage normal/portal mutation proof, workspace-scoped storage UI, bilingual quota errors, age-gated reconciliation dry-run, document preview-confirm browser QA 18/18, document fixture cleanup, landing EN/ID/mobile/metadata, Gate B migration evidence, Gate C dev health/proxy evidence, add-on purchase UI, checkout owner/origin guards, billing status UI, and Pakasir sync route/auth.
- PARTIAL: Gate D browser matrix; provider-dependent flows are code/runtime-wired but not completed with a real payment.
- OPEN: real Pakasir checkout/webhook/renewal/expiry proof, real reset/verification/document email delivery, concurrent quota stress, real reconciliation apply run, and production approval.

Release decision: dev-only QA continues; production remains blocked and untouched.

Open work, priority order:

1. Run authorized real Pakasir checkout on dev, then verify provider-confirmed webhook, entitlement, replay idempotency, renewal, cancellation, and expiry in DB/UI.
2. Run real reset/verification/resend and document email QA to `myvaword@gmail.com`; verify token lifecycle, inbox evidence, and secret-redacted logs.
3. Run concurrent quota stress and a real age-gated reconciliation apply against disposable/dev state.
4. Re-run Gate A–D after provider/email evidence. Production requires explicit approval; never deploy production implicitly.

Known environment facts:

- Dev app: `cubicle-dev`, `https://dev.cubiqlo.com`.
- Dev DB: `cubiqlo-new-pg`, database `cubicle_dev`.
- Production app: `cubiqlo-new-app`, database `cubicle`; do not touch.
- Public proxy: `dokploy-traefik` owns ports 80/443.
- Current source worktree is dirty/uncommitted; preserve unrelated changes.

Do not mark plan complete until Verification Matrix rows and Gates A–D have fresh evidence.
