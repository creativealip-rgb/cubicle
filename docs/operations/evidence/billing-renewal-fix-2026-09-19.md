# Billing renewal fix — 2026-09-19

## Issue

Same-plan paid checkout was blocked with HTTP 409, so a user on Solo/Team could not renew the same plan through the normal billing checkout.

## Fix

`/api/billing/checkout` now blocks only true downgrades:

```text
rank(target) < rank(effectivePlan)
```

Same-plan checkout is allowed and follows the same owner-bound Pakasir checkout path as upgrades.

## Verification

```text
Vitest: src/lib/billing-checkout-renewal.test.ts PASS
TypeScript: PASS
ESLint focused: PASS
Next build: PASS
Docker build: PASS
Production deploy: PASS
Health: { status: "ok", db: "ok" }
Public route: HTTP 308 to /app/dashboard
```

## Deploy

```text
Commit: 4a0b30bde36c5a3cb742a99ce0692418d53647ce
Image: cubiqlo-prod:sha-4a0b30bde36c5a3cb742a99ce0692418d53647ce
Container: cubiqlo-new-app-next
Ports: no host bindings
Proxy: dokploy-traefik remains sole public 80/443 owner
```
