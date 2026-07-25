#!/usr/bin/env bash
set -euo pipefail
START=$(date +%s); RUN=$(date -u +%Y%m%dT%H%M%SZ)
NET="auth-dr-net-$RUN"; PG="auth-dr-pg-$RUN"; REDIS="auth-dr-redis-$RUN"; APP="auth-dr-app-$RUN"; TMP=$(mktemp -d)
cleanup(){ docker rm -f "$APP" "$REDIS" "$PG" >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
LATEST=$(find /root/backups/cubicle -maxdepth 1 -type f -name 'cubicle_2*.sql.gz' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
NAME=$(basename "$LATEST"); TS=${NAME#cubicle_}; TS=${TS%.sql.gz}; GLOBALS="/root/backups/cubicle/cubicle_global_${TS}.sql.gz"
sha256sum -c "$LATEST.sha256" >/dev/null; sha256sum -c "$GLOBALS.sha256" >/dev/null
docker network create --internal "$NET" >/dev/null
docker run -d --name "$PG" --network "$NET" -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=*** -e POSTGRES_DB=cubicle postgres:16 >/dev/null
docker run -d --name "$REDIS" --network "$NET" redis:7-alpine redis-server --save '' --appendonly no >/dev/null
READY=0; for i in {1..60}; do if docker exec "$PG" psql -U postgres -d postgres -Atqc 'select 1' >/dev/null 2>&1; then sleep 2; docker exec "$PG" psql -U postgres -d postgres -Atqc 'select 1' >/dev/null 2>&1 && READY=1 && break; fi; sleep 1; done; [[ "$READY" = 1 ]]
zcat "$GLOBALS" | awk '/^CREATE ROLE postgres;/{next}/^ALTER ROLE postgres WITH /{next}{print}' | docker exec -i "$PG" psql -U postgres -d postgres -v ON_ERROR_STOP=1 >/dev/null
zcat "$LATEST" | docker exec -i "$PG" psql -U postgres -d cubicle -v ON_ERROR_STOP=1 >/dev/null
TARGET=$(docker exec "$PG" psql -U postgres -d cubicle -AtF '|' -c "SELECT u.id,u.email FROM users u JOIN accounts a ON a.user_id=u.id AND a.provider_id='credential' JOIN workspace_members wm ON wm.user_id=u.id WHERE wm.role='owner' AND a.password IS NOT NULL ORDER BY u.created_at LIMIT 1")
USER_ID=${TARGET%%|*}; EMAIL=${TARGET#*|}; [[ -n "$USER_ID" && -n "$EMAIL" ]]
PASS=$(openssl rand -base64 24 | tr -d '/+=')
HASH=$(node -e 'const {hashPassword}=require("@better-auth/utils/password"); hashPassword(process.argv[1]).then(console.log)' "$PASS")
HASH64=$(printf '%s' "$HASH" | base64 -w0)
printf "UPDATE accounts SET password=convert_from(decode('%s','base64'),'UTF8'),updated_at=now() WHERE user_id='%s' AND provider_id='credential'; DELETE FROM sessions WHERE user_id='%s';\n" "$HASH64" "$USER_ID" "$USER_ID" | docker exec -i "$PG" psql -U postgres -d cubicle -v ON_ERROR_STOP=1 >/dev/null
docker inspect cubicle-cubicle-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -vE '^(DATABASE_URL|RATE_LIMIT_REDIS_URL)=' > "$TMP/app.env"
printf 'DATABASE_URL=postgresql://postgres:***@%s:5432/cubicle\n' "$PG" >> "$TMP/app.env"
printf 'RATE_LIMIT_REDIS_URL=redis://%s:6379\n' "$REDIS" >> "$TMP/app.env"
docker run -d --name "$APP" --network "$NET" --env-file "$TMP/app.env" --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m cubicle-cubicle >/dev/null
OK=0; for i in {1..60}; do docker exec "$APP" wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 && OK=1 && break; sleep 1; done; [[ "$OK" = 1 ]]
EMAIL64=$(printf '%s' "$EMAIL" | base64 -w0); PASS64=$(printf '%s' "$PASS" | base64 -w0)
docker exec -i -e QA_EMAIL64="$EMAIL64" -e QA_PASS64="$PASS64" "$APP" node - <<'NODE'
const email=Buffer.from(process.env.QA_EMAIL64,'base64').toString();
const password=Buffer.from(process.env.QA_PASS64,'base64').toString();
(async()=>{
 const login=await fetch('http://127.0.0.1:3000/api/auth/sign-in/email',{method:'POST',headers:{'content-type':'application/json','origin':'https://cubiqlo.com','host':'cubiqlo.com'},body:JSON.stringify({email,password})});
 const text=await login.text();
 if(login.status!==200) throw new Error(`login status ${login.status}: ${text.slice(0,120)}`);
 const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 if(!cookie) throw new Error('missing auth cookie');
 const paths=['/api/auth/get-session','/app/dashboard','/app/clients','/app/projects','/app/invoices','/app/files','/app/contracts'];
 for(const path of paths){
   const r=await fetch('http://127.0.0.1:3000'+path,{headers:{cookie,host:'cubiqlo.com'},redirect:'manual'});
   const body=await r.text();
   const loc=r.headers.get('location')||'-';
   if(r.status!==200 || /\/login/.test(loc)) throw new Error(`${path} status=${r.status} location=${loc}`);
   if(path.includes('get-session') && !body.includes(email)) throw new Error('session user mismatch');
   console.log(`${path}|${r.status}|${body.length}|${loc}`);
 }
})().catch(e=>{console.error(e.message);process.exit(1)});
NODE
printf 'authenticated_recovery=OK\nsource=%s\nrto_seconds=%s\nproduction_db_untouched=true\nnetwork_internal=true public_ports=none\n' "$NAME" "$(( $(date +%s)-START ))"
