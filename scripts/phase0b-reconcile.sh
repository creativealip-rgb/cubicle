#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME-}
DB_PASSWORD=${DB_PASSWORD:-}

if [[ -z "$DB_NAME" ]]; then
  echo "DB_NAME is required" >&2
  exit 1
fi
if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "DB_NAME contains unsupported characters" >&2
  exit 1
fi
if [[ "$DB_NAME" == "cubicle" && "${ALLOW_PRODUCTION_RECONCILIATION:-}" != "1" ]]; then
  echo "Refusing production reconciliation without ALLOW_PRODUCTION_RECONCILIATION=1" >&2
  exit 1
fi

docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$DB_CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -AtF $'\t' <<'SQL'
SELECT 'format', 'cubiqlo-phase0b-reconciliation-v1';
SELECT 'server_version', current_setting('server_version');

SELECT format(
  'SELECT %L, %L, count(*)::text FROM public.%I;',
  'row_count', tablename, tablename
)
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec

SELECT 'orphan', 'projects_client_missing', count(*)::text
FROM projects p LEFT JOIN clients c ON c.id = p.client_id
WHERE c.id IS NULL;
SELECT 'orphan', 'projects_client_workspace_mismatch', count(*)::text
FROM projects p JOIN clients c ON c.id = p.client_id
WHERE c.workspace_id <> p.workspace_id;
SELECT 'orphan', 'projects_selected_package_missing', count(*)::text
FROM projects p LEFT JOIN packages pkg ON pkg.id = p.selected_package_id
WHERE p.selected_package_id IS NOT NULL AND pkg.id IS NULL;
SELECT 'orphan', 'projects_selected_package_workspace_mismatch', count(*)::text
FROM projects p JOIN packages pkg ON pkg.id = p.selected_package_id
WHERE pkg.workspace_id <> p.workspace_id;
SELECT 'orphan', 'packages_project_missing', count(*)::text
FROM packages pkg LEFT JOIN projects p ON p.id = pkg.project_id
WHERE pkg.project_id IS NOT NULL AND p.id IS NULL;
SELECT 'orphan', 'packages_project_workspace_mismatch', count(*)::text
FROM packages pkg JOIN projects p ON p.id = pkg.project_id
WHERE p.workspace_id <> pkg.workspace_id;
SELECT 'orphan', 'tasks_project_missing', count(*)::text
FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
WHERE p.id IS NULL;
SELECT 'orphan', 'tasks_project_workspace_mismatch', count(*)::text
FROM tasks t JOIN projects p ON p.id = t.project_id
WHERE p.workspace_id <> t.workspace_id;
SELECT 'orphan', 'time_entries_client_missing', count(*)::text
FROM time_entries te LEFT JOIN clients c ON c.id = te.client_id
WHERE te.client_id IS NOT NULL AND c.id IS NULL;
SELECT 'orphan', 'time_entries_client_workspace_mismatch', count(*)::text
FROM time_entries te JOIN clients c ON c.id = te.client_id
WHERE c.workspace_id <> te.workspace_id;
SELECT 'orphan', 'time_entries_project_missing', count(*)::text
FROM time_entries te LEFT JOIN projects p ON p.id = te.project_id
WHERE te.project_id IS NOT NULL AND p.id IS NULL;
SELECT 'orphan', 'time_entries_project_workspace_mismatch', count(*)::text
FROM time_entries te JOIN projects p ON p.id = te.project_id
WHERE p.workspace_id <> te.workspace_id;
SELECT 'orphan', 'time_entries_task_missing', count(*)::text
FROM time_entries te LEFT JOIN tasks t ON t.id = te.task_id
WHERE te.task_id IS NOT NULL AND t.id IS NULL;
SELECT 'orphan', 'time_entries_task_context_mismatch', count(*)::text
FROM time_entries te JOIN tasks t ON t.id = te.task_id
WHERE t.workspace_id <> te.workspace_id
   OR te.project_id IS DISTINCT FROM t.project_id;
SELECT 'orphan', 'time_entries_user_missing', count(*)::text
FROM time_entries te LEFT JOIN users u ON u.id = te.user_id
WHERE u.id IS NULL;
SELECT 'orphan', 'package_orders_project_missing', count(*)::text
FROM package_orders po LEFT JOIN projects p ON p.id = po.project_id
WHERE p.id IS NULL;
SELECT 'orphan', 'package_orders_package_missing', count(*)::text
FROM package_orders po LEFT JOIN packages pkg ON pkg.id = po.package_id
WHERE po.package_id IS NOT NULL AND pkg.id IS NULL;
SELECT 'orphan', 'package_orders_client_missing', count(*)::text
FROM package_orders po LEFT JOIN clients c ON c.id = po.client_id
WHERE po.client_id IS NOT NULL AND c.id IS NULL;
SELECT 'orphan', 'package_orders_context_mismatch', count(*)::text
FROM package_orders po
JOIN projects p ON p.id = po.project_id
LEFT JOIN packages pkg ON pkg.id = po.package_id
LEFT JOIN clients c ON c.id = po.client_id
WHERE p.workspace_id <> po.workspace_id
   OR (pkg.id IS NOT NULL AND pkg.workspace_id <> po.workspace_id)
   OR (c.id IS NOT NULL AND c.workspace_id <> po.workspace_id)
   OR (c.id IS NOT NULL AND p.client_id <> c.id);
SELECT 'orphan', 'invoices_client_missing', count(*)::text
FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
WHERE c.id IS NULL;
SELECT 'orphan', 'invoices_project_missing', count(*)::text
FROM invoices i LEFT JOIN projects p ON p.id = i.project_id
WHERE i.project_id IS NOT NULL AND p.id IS NULL;
SELECT 'orphan', 'invoices_context_mismatch', count(*)::text
FROM invoices i
JOIN clients c ON c.id = i.client_id
LEFT JOIN projects p ON p.id = i.project_id
WHERE c.workspace_id <> i.workspace_id
   OR (p.id IS NOT NULL AND (p.workspace_id <> i.workspace_id OR p.client_id <> i.client_id));
SELECT 'orphan', 'invoice_items_invoice_missing', count(*)::text
FROM invoice_items ii LEFT JOIN invoices i ON i.id = ii.invoice_id
WHERE i.id IS NULL;
SELECT 'orphan', 'invoice_items_time_source_missing', count(*)::text
FROM invoice_items ii LEFT JOIN time_entries te ON te.id = ii.source_id
WHERE ii.source_type = 'time_entry' AND ii.source_id IS NOT NULL AND te.id IS NULL;
SELECT 'orphan', 'invoice_items_project_source_missing', count(*)::text
FROM invoice_items ii LEFT JOIN projects p ON p.id = ii.source_id
WHERE ii.source_type = 'project' AND ii.source_id IS NOT NULL AND p.id IS NULL;
SELECT 'orphan', 'invoice_items_source_context_mismatch', count(*)::text
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
LEFT JOIN time_entries te ON ii.source_type = 'time_entry' AND te.id = ii.source_id
LEFT JOIN projects p ON ii.source_type = 'project' AND p.id = ii.source_id
WHERE (te.id IS NOT NULL AND (
         te.workspace_id <> i.workspace_id
         OR te.client_id IS DISTINCT FROM i.client_id
         OR (i.project_id IS NOT NULL AND te.project_id IS DISTINCT FROM i.project_id)
      ))
   OR (p.id IS NOT NULL AND (
         p.workspace_id <> i.workspace_id
         OR p.client_id <> i.client_id
         OR (i.project_id IS NOT NULL AND p.id <> i.project_id)
      ));

SELECT
  'project_package_map',
  p.id::text,
  p.workspace_id::text,
  coalesce(p.selected_package_id::text, ''),
  coalesce(pkg.id::text, ''),
  CASE
    WHEN p.selected_package_id IS NULL THEN 'none'
    WHEN pkg.id IS NULL THEN 'orphan'
    WHEN pkg.workspace_id <> p.workspace_id THEN 'workspace_mismatch'
    ELSE 'resolved'
  END
FROM projects p
LEFT JOIN packages pkg ON pkg.id = p.selected_package_id
ORDER BY p.id;

SELECT
  'order_package_map',
  po.id::text,
  po.workspace_id::text,
  po.project_id::text,
  coalesce(po.package_id::text, ''),
  coalesce(pkg.id::text, ''),
  coalesce(po.client_id::text, ''),
  CASE
    WHEN po.package_id IS NULL THEN 'snapshot_only'
    WHEN pkg.id IS NULL THEN 'orphan'
    WHEN pkg.workspace_id <> po.workspace_id THEN 'workspace_mismatch'
    ELSE 'resolved'
  END
FROM package_orders po
LEFT JOIN packages pkg ON pkg.id = po.package_id
ORDER BY po.id;

SELECT
  'invoice_source_map',
  ii.id::text,
  ii.invoice_id::text,
  coalesce(ii.source_type, ''),
  coalesce(ii.source_id::text, ''),
  CASE
    WHEN ii.source_id IS NULL THEN 'manual_or_snapshot'
    WHEN ii.source_type = 'time_entry' AND te.id IS NOT NULL THEN 'resolved'
    WHEN ii.source_type = 'project' AND p.id IS NOT NULL THEN 'resolved'
    ELSE 'orphan_or_unknown'
  END
FROM invoice_items ii
LEFT JOIN time_entries te ON ii.source_type = 'time_entry' AND te.id = ii.source_id
LEFT JOIN projects p ON ii.source_type = 'project' AND p.id = ii.source_id
ORDER BY ii.id;

SELECT
  'package_classification',
  pkg.id::text,
  pkg.workspace_id::text,
  CASE
    WHEN concat_ws(' ', pkg.name, pkg.description, pkg.features) ~* '(/\s*month|per\s+month|monthly|/\s*bulan|per\s+bulan|bulanan)'
      THEN 'legacy_recurring_unmodeled'
    ELSE 'legacy_unclassified'
  END,
  pkg.active::text,
  coalesce(pkg.hours::text, ''),
  pkg.price::text,
  pkg.currency
FROM packages pkg
ORDER BY pkg.id;

SELECT
  'package_order_total',
  status,
  currency,
  count(*)::text,
  coalesce(sum(price), 0)::text,
  coalesce(sum(hours), 0)::text
FROM package_orders
GROUP BY status, currency
ORDER BY status, currency;

SELECT
  'invoice_total',
  status,
  currency,
  count(*)::text,
  coalesce(sum(subtotal), 0)::text,
  coalesce(sum(total), 0)::text
FROM invoices
GROUP BY status, currency
ORDER BY status, currency;

SELECT
  'time_total',
  status,
  billable::text,
  count(*)::text,
  coalesce(sum(duration_minutes), 0)::text,
  coalesce(min(coalesce(start_time::date, created_at::date))::text, ''),
  coalesce(max(coalesce(end_time::date, start_time::date, created_at::date))::text, '')
FROM time_entries
GROUP BY status, billable
ORDER BY status, billable;

SELECT
  'portal_visibility',
  'projects',
  client_visible::text,
  count(*)::text
FROM projects
GROUP BY client_visible
ORDER BY client_visible;
SELECT
  'portal_visibility',
  'active_packages',
  active::text,
  count(*)::text
FROM packages
GROUP BY active
ORDER BY active;

SELECT
  'ledger',
  id,
  checksum,
  execution_ms::text,
  operator_name
FROM cubiqlo_migrations
ORDER BY id;
SQL
