# Cubiqlo Phase 0B dev QA authentication evidence

Generated UTC: 2026-07-27

## Seed isolation

```text
dev QA seed: PASS database=cubicle_dev email=alip.qa@cubiqlo.test workspace=2c9169d6-0c30-48e1-8482-ee469e1cbe06
production-target-guard=PASS
production cubicle matching QA email rows=0
```

Seed script reads QA credentials from `/root/.secrets/cubiqlo-dev-access.txt`; no password is committed or written to evidence.

## Database state

```text
email=alip.qa@cubiqlo.test
email_verified=true
provider_id=credential
workspace=Cubiqlo Development QA
role=owner
user_plan=team
workspace_plan=team
```

## Live authenticated smoke

Request target: `https://dev.cubiqlo.com`, protected by local Basic Auth and Better Auth QA session.

```text
POST /api/auth/sign-in/email = 200
GET /api/auth/get-session = 200
GET /app/dashboard = 200
session_email_match=true
session_has_user=true
dashboard_has_app_marker=true
```

Production account/DB was not used or modified.
