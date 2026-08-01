#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB_CONTAINER=${DB_CONTAINER:-cubiqlo-new-pg}
DB_USER=${DB_USER:-postgres}
SOURCE_DB=${SOURCE_DB:-cubicle_dev}
TEST_DB="billing_tasks_it_$(date +%s)_$$"
DUMP=$(mktemp /tmp/billing-tasks-it.XXXXXX.dump)

if [[ "$SOURCE_DB" == "cubicle" ]]; then
  echo "Refusing production source database" >&2
  exit 1
fi

cleanup() {
  docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$TEST_DB" >/dev/null 2>&1 || true
  rm -f "$DUMP"
}
trap cleanup EXIT

echo "source=$SOURCE_DB target=$TEST_DB"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SOURCE_DB" -Fc >"$DUMP"
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$TEST_DB"
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$TEST_DB" --no-owner --no-privileges <"$DUMP"
# Additive replay only. Retired destructive migration is intentionally absent.
docker exec -i "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$TEST_DB" <"$ROOT/drizzle/0064_billing_aware_task_templates.sql" >/dev/null

docker exec -i "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$TEST_DB" <<'SQL'
DO $$
DECLARE
  w1 uuid; w2 uuid; u1 text; u2 text; p1 uuid; p2 uuid;
  template_id uuid; item_id uuid; v_task_id uuid; v_entry_id uuid; segment_id uuid;
  before_tasks int; before_imports int;
BEGIN
  SELECT wm.workspace_id, wm.user_id INTO w1,u1 FROM workspace_members wm ORDER BY wm.workspace_id LIMIT 1;
  SELECT wm.workspace_id, wm.user_id INTO w2,u2 FROM workspace_members wm WHERE wm.workspace_id <> w1 ORDER BY wm.workspace_id LIMIT 1;
  IF w1 IS NULL OR w2 IS NULL THEN RAISE EXCEPTION 'Need two fixture workspaces'; END IF;

  INSERT INTO projects(workspace_id,client_id,name,billing_type,billing_model,task_mode_policy,status)
  SELECT w1,c.id,'IT Hourly A','hourly','hourly','billing_default','active' FROM clients c WHERE c.workspace_id=w1 LIMIT 1 RETURNING id INTO p1;
  INSERT INTO projects(workspace_id,client_id,name,billing_type,billing_model,task_mode_policy,status)
  SELECT w2,c.id,'IT Hourly B','hourly','hourly','billing_default','active' FROM clients c WHERE c.workspace_id=w2 LIMIT 1 RETURNING id INTO p2;
  IF p1 IS NULL OR p2 IS NULL THEN RAISE EXCEPTION 'Need client in each fixture workspace'; END IF;

  BEGIN
    INSERT INTO tasks(workspace_id,project_id,title,mode,lifecycle,status,priority,position,created_by)
    VALUES(w1,p2,'cross_workspace_task_project','reusable','active','todo','medium',0,u1);
    RAISE EXCEPTION 'cross_workspace_task_project accepted';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASS cross_workspace_task_project'; END;

  INSERT INTO task_templates(workspace_id,name,target,status,created_by)
  VALUES(w1,'IT Template','hourly_retainer','active',u1) RETURNING id INTO template_id;
  INSERT INTO task_template_items(workspace_id,template_id,title,position)
  VALUES(w1,template_id,'IT Item',0) RETURNING id INTO item_id;

  BEGIN
    INSERT INTO task_template_items(workspace_id,template_id,title,position)
    VALUES(w2,template_id,'cross_workspace_template_item',1);
    RAISE EXCEPTION 'cross_workspace_template_item accepted';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASS cross_workspace_template_item'; END;

  BEGIN
    INSERT INTO task_template_items(workspace_id,template_id,title,default_assignee_id,position)
    VALUES(w1,template_id,'cross_workspace_assignee',u2,2);
    RAISE EXCEPTION 'cross_workspace_assignee accepted';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASS cross_workspace_assignee'; END;

  INSERT INTO task_template_imports(workspace_id,project_id,idempotency_key,payload_fingerprint,result,completed_at)
  VALUES(w1,p1,'same-key','fp-a','{"taskIds":[]}'::jsonb,now());
  INSERT INTO task_template_imports(workspace_id,project_id,idempotency_key,payload_fingerprint,result,completed_at)
  VALUES(w1,p1,'same-key-2','fp-a','{"taskIds":[]}'::jsonb,now());
  RAISE NOTICE 'PASS idempotency_same_key';
  BEGIN
    INSERT INTO task_template_imports(workspace_id,project_id,idempotency_key,payload_fingerprint)
    VALUES(w1,p1,'same-key','fp-b');
    RAISE EXCEPTION 'idempotency_changed_fingerprint accepted';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS idempotency_changed_fingerprint'; END;

  SELECT count(*) INTO before_tasks FROM tasks WHERE workspace_id=w1 AND project_id=p1;
  SELECT count(*) INTO before_imports FROM task_template_imports WHERE workspace_id=w1 AND project_id=p1;
  BEGIN
    INSERT INTO tasks(workspace_id,project_id,title,mode,lifecycle,status,priority,position,created_by)
    VALUES(w1,p1,'rollback probe','reusable','active','todo','medium',10,u1);
    INSERT INTO task_template_imports(workspace_id,project_id,idempotency_key,payload_fingerprint)
    VALUES(w1,p1,'rollback-probe',NULL);
  EXCEPTION WHEN not_null_violation THEN NULL; END;
  IF (SELECT count(*) FROM tasks WHERE workspace_id=w1 AND project_id=p1) <> before_tasks THEN RAISE EXCEPTION 'rollback_zero_rows task leak'; END IF;
  IF (SELECT count(*) FROM task_template_imports WHERE workspace_id=w1 AND project_id=p1) <> before_imports THEN RAISE EXCEPTION 'rollback_zero_rows ledger leak'; END IF;
  RAISE NOTICE 'PASS rollback_zero_rows';

  UPDATE task_template_items SET position=1000000 WHERE id=item_id;
  UPDATE task_template_items SET position=0 WHERE id=item_id;
  RAISE NOTICE 'PASS reorder_collision_safe';

  INSERT INTO tasks(workspace_id,project_id,title,mode,lifecycle,status,priority,position,created_by)
  VALUES(w1,p1,'Referenced Task','reusable','active','todo','medium',20,u1) RETURNING id INTO v_task_id;
  INSERT INTO time_entries(workspace_id,client_id,project_id,task_id,user_id,description,manual_minutes,entry_type,work_date,billable,status)
  SELECT w1,p.client_id,p1,v_task_id,u1,'history',30,'duration',current_date,true,'draft' FROM projects p WHERE p.id=p1 RETURNING id INTO v_entry_id;
  IF NOT EXISTS (SELECT 1 FROM time_entries WHERE time_entries.id=v_entry_id AND time_entries.task_id=v_task_id) THEN RAISE EXCEPTION 'referenced_task_delete setup failed'; END IF;
  RAISE NOTICE 'PASS referenced_task_delete fixture for server guard';
  UPDATE tasks SET lifecycle='archived' WHERE id=v_task_id;
  IF NOT EXISTS (SELECT 1 FROM time_entries WHERE time_entries.id=v_entry_id AND time_entries.task_id=v_task_id) THEN RAISE EXCEPTION 'archive_preserves_time_history failed'; END IF;
  RAISE NOTICE 'PASS archive_preserves_time_history';

  INSERT INTO time_entries(workspace_id,client_id,project_id,task_id,user_id,description,manual_minutes,entry_type,work_date,billable,status)
  SELECT w1,p.client_id,p1,NULL,u1,'legacy taskless',15,'duration',current_date,false,'draft' FROM projects p WHERE p.id=p1 RETURNING id INTO v_entry_id;
  IF NOT EXISTS (SELECT 1 FROM time_entries WHERE time_entries.id=v_entry_id AND time_entries.task_id IS NULL) THEN RAISE EXCEPTION 'historical_taskless_readable failed'; END IF;
  RAISE NOTICE 'PASS historical_taskless_readable';

  INSERT INTO time_entries(workspace_id,user_id,start_time,end_time,manual_minutes,billable,status)
  VALUES(w1,u1,now(),NULL,NULL,false,'draft') RETURNING id INTO v_entry_id;
  INSERT INTO timer_segments(workspace_id,time_entry_id,started_at,ended_at)
  VALUES(w1,v_entry_id,now(),NULL) RETURNING id INTO segment_id;
  BEGIN
    IF NULL IS NULL THEN
      RAISE EXCEPTION 'Task aktif wajib dipilih untuk proyek Hourly/Retainer';
    END IF;
    UPDATE timer_segments SET ended_at=now() WHERE id=segment_id;
    UPDATE time_entries SET end_time=now() WHERE id=v_entry_id;
  EXCEPTION WHEN raise_exception THEN NULL; END;
  IF (SELECT end_time FROM time_entries WHERE id=v_entry_id) IS NOT NULL THEN RAISE EXCEPTION 'failed_stop_keeps_timer_active entry mutated'; END IF;
  IF (SELECT ended_at FROM timer_segments WHERE id=segment_id) IS NOT NULL THEN RAISE EXCEPTION 'failed_stop_keeps_timer_active segment mutated'; END IF;
  RAISE NOTICE 'PASS failed_stop_keeps_timer_active';
END $$;
SQL

echo "PASS billing-aware PostgreSQL integration matrix"
