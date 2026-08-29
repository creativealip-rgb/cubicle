#!/usr/bin/env bash
set -euo pipefail
DB_CONTAINER=${DB_CONTAINER:-cubiqlo-new-pg}
DB_USER=${DB_USER:-postgres}
SOURCE_DB=${SOURCE_DB:-cubicle_dev}
TEST_DB="invoice_finance_qa_$(date +%s)_$$"
DUMP=$(mktemp /tmp/invoice-finance.XXXXXX.dump)
TMP=$(mktemp -d /tmp/invoice-finance.XXXXXX)
[[ "$SOURCE_DB" != cubicle ]] || { echo "Refusing production source database" >&2; exit 1; }
cleanup(){ docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$TEST_DB" >/dev/null 2>&1 || true; rm -f "$DUMP"; rm -rf "$TMP"; }
trap cleanup EXIT
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SOURCE_DB" -Fc >"$DUMP"
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$TEST_DB"
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$TEST_DB" --no-owner --no-privileges <"$DUMP"
PSQL=(docker exec -i "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$TEST_DB")
"${PSQL[@]}" <<'SQL'
CREATE TABLE concurrency_probe(k text primary key,v uuid not null);
WITH x AS (SELECT wm.workspace_id w,wm.user_id u,c.id c FROM workspace_members wm JOIN clients c ON c.workspace_id=wm.workspace_id LIMIT 1),
i AS (INSERT INTO invoices(workspace_id,client_id,invoice_number,issue_date,total,status) SELECT w,c,'IT-CONCURRENCY',current_date,100,'sent' FROM x RETURNING id)
INSERT INTO concurrency_probe SELECT 'invoice',id FROM i;
WITH x AS (SELECT wm.workspace_id w,wm.user_id u,c.id c FROM workspace_members wm JOIN clients c ON c.workspace_id=wm.workspace_id LIMIT 1),
p AS (INSERT INTO projects(workspace_id,client_id,name,billing_type,billing_model,status) SELECT w,c,'IT concurrency','hourly','hourly','active' FROM x RETURNING id,workspace_id,client_id),
t AS (INSERT INTO time_entries(workspace_id,client_id,project_id,user_id,description,manual_minutes,entry_type,work_date,billable,hourly_rate,status) SELECT p.workspace_id,p.client_id,p.id,x.u,'IT time',60,'duration',current_date,true,100,'approved' FROM p,x RETURNING id)
INSERT INTO concurrency_probe SELECT 'time',id FROM t;
SQL
cat >"$TMP/pay.sql" <<'SQL'
BEGIN;
SELECT id FROM invoices WHERE id=(SELECT v FROM concurrency_probe WHERE k='invoice') FOR UPDATE;
INSERT INTO payments(invoice_id,amount,paid_at)
SELECT v,70,current_date FROM concurrency_probe WHERE k='invoice' AND 70 + (SELECT coalesce(sum(amount),0) FROM payments WHERE invoice_id=v) <= (SELECT total FROM invoices WHERE id=v);
SELECT pg_sleep(:sleep);
COMMIT;
SQL
("${PSQL[@]}" -v sleep=2 <"$TMP/pay.sql" >"$TMP/pay1" 2>&1) & a=$!; sleep .2
("${PSQL[@]}" -v sleep=0 <"$TMP/pay.sql" >"$TMP/pay2" 2>&1) & b=$!; wait "$a"; wait "$b"
[[ $("${PSQL[@]}" -Atc "select count(*)||':'||coalesce(sum(amount),0) from payments where invoice_id=(select v from concurrency_probe where k='invoice')") == "1:70.00" ]]
echo 'PASS concurrent_payment_no_overpay'

"${PSQL[@]}" -c "delete from payments; update invoices set status='sent' where id=(select v from concurrency_probe where k='invoice')" >/dev/null
cat >"$TMP/payment-lock.sql" <<'SQL'
BEGIN; SELECT id FROM invoices WHERE id=(SELECT v FROM concurrency_probe WHERE k='invoice') FOR UPDATE;
SELECT pg_sleep(2); INSERT INTO payments(invoice_id,amount,paid_at) SELECT v,10,current_date FROM concurrency_probe WHERE k='invoice'; COMMIT;
SQL
cat >"$TMP/void-lock.sql" <<'SQL'
BEGIN; SELECT id FROM invoices WHERE id=(SELECT v FROM concurrency_probe WHERE k='invoice') FOR UPDATE;
UPDATE invoices i SET status='cancelled' WHERE i.id=(SELECT v FROM concurrency_probe WHERE k='invoice') AND EXISTS(SELECT 1 FROM payments p WHERE p.invoice_id=i.id); COMMIT;
SQL
("${PSQL[@]}" <"$TMP/payment-lock.sql" >/dev/null) & a=$!; sleep .2; ("${PSQL[@]}" <"$TMP/void-lock.sql" >/dev/null) & b=$!; wait "$a"; wait "$b"
[[ $("${PSQL[@]}" -Atc "select status||':'||(select count(*) from payments where invoice_id=invoices.id) from invoices where id=(select v from concurrency_probe where k='invoice')") == 'cancelled:1' ]]
echo 'PASS payment_void_serialized'

"${PSQL[@]}" -c "update invoices set status='draft',subtotal=0,total=0 where id=(select v from concurrency_probe where k='invoice'); delete from payments" >/dev/null
cat >"$TMP/import.sql" <<'SQL'
BEGIN; SELECT id FROM time_entries WHERE id=(SELECT v FROM concurrency_probe WHERE k='time') AND status='approved' FOR UPDATE;
SELECT pg_sleep(2); INSERT INTO invoice_items(invoice_id,description,quantity,unit_price,amount,source_type,source_id,previous_time_entry_status) SELECT (SELECT v FROM concurrency_probe WHERE k='invoice'),'IT time',1,100,100,'time_entry',v,'approved' FROM concurrency_probe WHERE k='time'; UPDATE time_entries SET status='invoiced' WHERE id=(SELECT v FROM concurrency_probe WHERE k='time') AND status='approved'; COMMIT;
SQL
cat >"$TMP/edit.sql" <<'SQL'
BEGIN; UPDATE time_entries SET description='stale edit' WHERE id=(SELECT v FROM concurrency_probe WHERE k='time') AND status<>'invoiced'; COMMIT;
SQL
("${PSQL[@]}" <"$TMP/import.sql" >/dev/null) & a=$!; sleep .2; ("${PSQL[@]}" <"$TMP/edit.sql" >"$TMP/edit.out") & b=$!; wait "$a"; wait "$b"
[[ $("${PSQL[@]}" -Atc "select status||':'||description from time_entries where id=(select v from concurrency_probe where k='time')") == 'invoiced:IT time' ]]
echo 'PASS time_edit_import_serialized'
if "${PSQL[@]}" -c "insert into invoice_items(invoice_id,description,source_type,source_id) select (select v from concurrency_probe where k='invoice'),'duplicate','time_entry',v from concurrency_probe where k='time'" >/dev/null 2>&1; then exit 1; fi
echo 'PASS duplicate_time_import_rejected'

"${PSQL[@]}" -c "delete from invoice_items; update invoices set subtotal=0,total=0 where id=(select v from concurrency_probe where k='invoice')" >/dev/null
cat >"$TMP/item.sql" <<'SQL'
BEGIN; SELECT id FROM invoices WHERE id=(SELECT v FROM concurrency_probe WHERE k='invoice') FOR UPDATE;
INSERT INTO invoice_items(invoice_id,description,quantity,unit_price,amount) SELECT v,:label,1,:amount,:amount FROM concurrency_probe WHERE k='invoice'; UPDATE invoices SET subtotal=(SELECT sum(amount) FROM invoice_items WHERE invoice_id=invoices.id),total=(SELECT sum(amount) FROM invoice_items WHERE invoice_id=invoices.id) WHERE id=(SELECT v FROM concurrency_probe WHERE k='invoice'); SELECT pg_sleep(:sleep); COMMIT;
SQL
("${PSQL[@]}" -v label="'one'" -v amount=40 -v sleep=2 <"$TMP/item.sql" >/dev/null) & a=$!; sleep .2; ("${PSQL[@]}" -v label="'two'" -v amount=60 -v sleep=0 <"$TMP/item.sql" >/dev/null) & b=$!; wait "$a"; wait "$b"
[[ $("${PSQL[@]}" -Atc "select total||':'||(select sum(amount) from invoice_items where invoice_id=invoices.id) from invoices where id=(select v from concurrency_probe where k='invoice')") == '100.00:100.00' ]]
echo 'PASS concurrent_item_total_consistent'
