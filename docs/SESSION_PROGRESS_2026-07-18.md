# Cubiqlo session progress — 2026-07-18

Branch: `main`  
Live: `cubicle-cubicle-1` healthy, version **0.1.50**  
Repo: `/root/projects/cubicle`

## Done this session (after v0.1.41 base)

### P0–P3 product backlog
- Plan limit soft-fail + billing upgrade paths (clients/projects)
- Portal enable on client create + activation UX (full link, checklist)
- File/expense upload same-origin proxy + CSP
- Timer/manual entry integrity + client→project→task cascade
- Dialog/Sheet portaled Select guard
- Invoice create skeleton, meta save, logo branding upload, public invoice branding
- Notes/journal polish, time tags optional, task vs time banners
- Files filter/visibility/deliverable auto-client
- Team invite plan gate
- Questionnaire mobile cards + i18n
- Dashboard multi-currency labels (no cross-currency sum)
- Stale Server Action helper + `(app)/error.tsx`
- Portal request type `approval` (Approve / Request changes)

### Portal product decisions (Alip)
1. **No client comments** in portal — contact via **WhatsApp + Email** only  
   (`billingPhone`, `replyToEmail`/`billingEmail`)
2. **Recent Activity** compact: default 3, pool 5, group task spam, 1 time entry/project
3. Contact card copy clean (no “portal gak nerima komentar”)
4. **Task review actionable**: client can **Setujui** → `done` or **Minta revisi** → `in_progress`  
   (`respondPortalTask`, notif `client_task_approved` / `client_task_revision`)

### How client sees files
- Only files with `visibility = client` under client-visible projects
- Shown in project accordion **Files** + download `?token=`
- Deliverable type auto-forces client visibility on upload

## Changelog anchors
- `CHANGELOG.md` entries **v0.1.42 … v0.1.50**
- Backlog status: `docs/bugs-manual-qa.md`

## Still open / hold
- PROD-003 Sales menu scope
- Mobile form density beyond questionnaires
- Soft-fail `{ok:false}` not yet universal
- Kalender / Brain / Prompt deep QA

## Verify live
```bash
curl -sS http://127.0.0.1:3000/api/health   # {"ok":true}
docker ps --filter name=cubicle-cubicle-1
```
