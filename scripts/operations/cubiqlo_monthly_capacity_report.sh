#!/usr/bin/env bash
set -euo pipefail

PG_CONTAINER=${PG_CONTAINER:-cubicle-pg}
DB_NAME=${DB_NAME:-cubicle}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR=${BACKUP_DIR:-/root/backups/cubicle}
STATE_DIR=${STATE_DIR:-/root/backups/cubicle/metrics}
mkdir -p "$STATE_DIR"

now=$(date +%s)
month=$(date -u +%Y-%m)
db_bytes=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atqc "SELECT pg_database_size(current_database())")
db_pretty=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atqc "SELECT pg_size_pretty(pg_database_size(current_database()))")
connections=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atqc "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()")
max_connections=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atqc "SHOW max_connections")
waiting_locks=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atqc "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'")
long_transactions=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atqc "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND xact_start IS NOT NULL AND now()-xact_start > interval '10 minutes'")
dead=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -AtF '|' -qc "SELECT COALESCE(sum(n_dead_tup),0),COALESCE(sum(n_live_tup),0),COALESCE(max(last_autovacuum)::text,'never'),COALESCE(max(last_autoanalyze)::text,'never') FROM pg_stat_user_tables")
dead_tuples=${dead%%|*}; rest=${dead#*|}; live_tuples=${rest%%|*}; rest=${rest#*|}; last_autovacuum=${rest%%|*}; last_autoanalyze=${rest#*|}
dead_ratio=$(python3 -c "d=$dead_tuples; l=$live_tuples; print(round((d/max(d+l,1))*100,2))")
disk_usage=$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
disk_free=$(df -hP / | awk 'NR==2 {print $4}')
latest=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'cubicle_2*.sql.gz' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
[[ -n "$latest" ]] || { echo 'Cubiqlo monthly capacity alert: no local backup found'; exit 1; }
backup_mtime=$(stat -c %Y "$latest"); backup_age_hours=$(( (now-backup_mtime)/3600 ))
checksum=FAIL; sha256sum -c "$latest.sha256" >/dev/null 2>&1 && checksum=OK
restore_log_age_hours=-1
if [[ -f /var/log/cubicle-restore-test.log ]]; then restore_log_age_hours=$(( (now-$(stat -c %Y /var/log/cubicle-restore-test.log))/3600 )); fi
offsite_log_age_hours=-1
if [[ -f /var/log/cubicle-backup-offsite.log ]]; then offsite_log_age_hours=$(( (now-$(stat -c %Y /var/log/cubicle-backup-offsite.log))/3600 )); fi
prev_file=$(find "$STATE_DIR" -maxdepth 1 -type f -name 'capacity-*.bytes' ! -name "capacity-$month.bytes" -printf '%f\n' | sort | tail -1)
growth='n/a (first snapshot)'
if [[ -n "$prev_file" ]]; then prev=$(cat "$STATE_DIR/$prev_file"); delta=$((db_bytes-prev)); growth=$(python3 -c "d=$delta; p=$prev; print(f'{d:+,} bytes ({(d/max(p,1))*100:+.2f}%)')"); fi
printf '%s\n' "$db_bytes" > "$STATE_DIR/capacity-$month.bytes"

top_tables=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -AtF '|' -qc "SELECT relname,pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 5" | paste -sd ';' -)
top_queries=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -AtF '|' -qc "SELECT calls,round(total_exec_time::numeric,1),round(mean_exec_time::numeric,2),left(regexp_replace(query,E'[\\n\\r\\t ]+',' ','g'),100) FROM pg_stat_statements WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) ORDER BY total_exec_time DESC LIMIT 5" | paste -sd ';' -)
conn_pct=$(( connections*100/max_connections ))
status=OK
reasons=()
(( disk_usage >= 85 )) && status=ALERT && reasons+=("disk ${disk_usage}%")
(( backup_age_hours > 26 )) && status=ALERT && reasons+=("backup ${backup_age_hours}h old")
[[ "$checksum" != OK ]] && status=ALERT && reasons+=("checksum failed")
(( waiting_locks > 0 )) && status=ALERT && reasons+=("$waiting_locks lock waits")
(( long_transactions > 0 )) && status=ALERT && reasons+=("$long_transactions long transactions")
(( conn_pct >= 80 )) && status=ALERT && reasons+=("connections ${conn_pct}%")
if (( dead_tuples >= 10000 )) && python3 -c "raise SystemExit(0 if float('$dead_ratio') >= 20 else 1)"; then
  status=ALERT
  reasons+=("dead tuples ${dead_ratio}% (${dead_tuples} rows)")
fi

printf 'Cubiqlo monthly capacity report — %s\n' "$month"
reason_text=''
if ((${#reasons[@]})); then reason_text=" — ${reasons[*]}"; fi
printf 'Status: %s%s\n' "$status" "$reason_text"
printf 'DB: %s (%s bytes); growth: %s\n' "$db_pretty" "$db_bytes" "$growth"
printf 'Connections: %s/%s (%s%%); waiting locks: %s; transactions >10m: %s\n' "$connections" "$max_connections" "$conn_pct" "$waiting_locks" "$long_transactions"
printf 'Tuples: live=%s dead=%s (%s%%); last autovacuum=%s; last autoanalyze=%s\n' "$live_tuples" "$dead_tuples" "$dead_ratio" "$last_autovacuum" "$last_autoanalyze"
printf 'Disk: %s%% used; %s free\n' "$disk_usage" "$disk_free"
printf 'Backup: %sh old; checksum=%s; offsite-log=%sh; restore-log=%sh\n' "$backup_age_hours" "$checksum" "$offsite_log_age_hours" "$restore_log_age_hours"
printf 'Largest tables: %s\n' "${top_tables:-none}"
printf 'Top query stats (calls|total_ms|mean_ms|query): %s\n' "${top_queries:-none}"
[[ "$status" == OK ]]
