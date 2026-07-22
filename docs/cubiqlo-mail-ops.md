# Cubiqlo mail operations

**Status:** Live — 2026-07-22

## Architecture

- Domain: `cubiqlo.com`
- Webmail URL: `https://mail.cubiqlo.com`
- Mail server: Stalwart (`private-mail-stalwart`)
- Webmail UI: SnappyMail (`private-mail-snappymail`)
- Internal web proxy: Caddy (`private-mail-caddy`)
- Public HTTPS: `dokploy-traefik` exact host route for `mail.cubiqlo.com`
- Project directory: `/root/private-mail-starter`
- Credentials file: `/root/.secrets/cubiqlo-mailbox-credentials.txt` (not committed)

## DNS

- `A mail.cubiqlo.com -> 168.144.37.19`
- `MX cubiqlo.com -> mail.cubiqlo.com` priority 10
- Root SPF allows MX delivery plus Resend/Amazon SES sending

## Outbound delivery

Stalwart submits external outbound mail through Resend relay.

- Relay host: `smtp.resend.com`
- Port: `2587`
- Username: `resend`
- Secret source: `RELAY_PASSWORD` in `/root/private-mail-starter/.env`
- TLS mode: SMTP + STARTTLS

Why `2587`: the VPS times out on Resend `587` and `465`, while `2587` and `2465` are reachable.

## Business mailboxes

- `admin@cubiqlo.com` — primary admin
- `marketing@cubiqlo.com` — campaigns, promo, brand requests
- `cs@cubiqlo.com` — customer support
- `sales@cubiqlo.com` — leads, proposals, closing
- `billing@cubiqlo.com` — invoices, payment reminders, proof of payment
- `finance@cubiqlo.com` — internal finance, reconciliation, payouts

Login uses the full email address as username.

## Verification done

- Stalwart/SnappyMail containers running on VPS
- Webmail reachable at `https://mail.cubiqlo.com`
- `admin@cubiqlo.com` can send via local SMTPS submission (`127.0.0.1:465`)
- Fresh outbound smoke test to Gmail appears in Resend API with `last_event: delivered`
- All business mailboxes pass local IMAP login check on `127.0.0.1:993`

## Common operations

Check containers:

```bash
cd /root/private-mail-starter
docker compose ps
```

Restart Stalwart after route/config changes:

```bash
cd /root/private-mail-starter
docker compose restart stalwart
```

Check relay reachability from VPS:

```bash
python3 - <<'PY'
import socket
for port in (587, 2587, 465, 2465):
    try:
        s = socket.create_connection(("smtp.resend.com", port), timeout=8)
        print(port, "OPEN")
        s.close()
    except Exception as e:
        print(port, "FAIL", repr(e))
PY
```

Expected stable result on this VPS:

- `2587 OPEN`
- `2465 OPEN`
- `587` / `465` may timeout

## Pitfalls

- SnappyMail showing a message in Sent only means Stalwart accepted it locally; it can still be stuck in Stalwart queue.
- If messages sit in queue after changing outbound route, restart Stalwart and send a fresh smoke test.
- Old queued test emails can retain stale errors from direct MX delivery. Prefer a fresh message to validate current routing.
- Do not bind Caddy/Traefik from this stack to host `80/443`; public web routing must stay behind `dokploy-traefik`.
- Do not commit mailbox passwords, API keys, or `.env` values.
