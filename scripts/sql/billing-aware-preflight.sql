\pset pager off
\echo '== Project counts by legacy and canonical billing model =='
SELECT billing_type, billing_model, count(*)
FROM projects
GROUP BY billing_type, billing_model
ORDER BY billing_type, billing_model;

\echo '== Package classification evidence =='
SELECT p.id, p.name, p.billing_type, p.billing_model, p.selected_package_id,
       pk.name AS package_name, pk.hours, pk.allowance_type,
       pk.allowance_value, pk.lifecycle_class,
       count(DISTINCT te.id) AS time_entries,
       count(DISTINCT i.id) AS invoices
FROM projects p
LEFT JOIN packages pk ON pk.id = p.selected_package_id
LEFT JOIN time_entries te ON te.project_id = p.id
LEFT JOIN invoices i ON i.project_id = p.id
WHERE p.billing_type = 'package'
GROUP BY p.id, pk.id
ORDER BY p.name, p.id;

\echo '== Fixed Price time states =='
SELECT p.id, p.name, te.status, (ii.id IS NOT NULL) AS invoiced,
       count(DISTINCT te.id) AS entries,
       coalesce(sum(te.duration_minutes), 0) AS minutes
FROM projects p
JOIN time_entries te ON te.project_id = p.id
LEFT JOIN invoice_items ii
  ON ii.source_type = 'time_entry' AND ii.source_id = te.id
WHERE p.billing_type = 'project'
GROUP BY p.id, p.name, te.status, (ii.id IS NOT NULL)
ORDER BY p.name, te.status, invoiced;

\echo '== Open timers =='
SELECT te.id, te.user_id, te.project_id, p.billing_type, p.billing_model
FROM time_entries te
LEFT JOIN projects p ON p.id = te.project_id
WHERE te.end_time IS NULL AND te.manual_minutes IS NULL
ORDER BY te.created_at;

\echo '== Dependency counts =='
SELECT
  (SELECT count(*) FROM project_activities) AS project_activities,
  (SELECT count(*) FROM time_entries WHERE activity_id IS NOT NULL) AS activity_time_entries,
  (SELECT count(*) FROM project_services) AS project_services,
  (SELECT count(*) FROM package_orders) AS package_orders,
  (SELECT count(*) FROM custom_package_requests) AS custom_package_requests,
  (SELECT count(*) FROM proposals WHERE line_items <> '[]'::jsonb) AS proposals_with_snapshots,
  (SELECT count(*) FROM tasks WHERE project_service_id IS NOT NULL) AS task_project_service_links,
  (SELECT count(*) FROM time_entries WHERE project_service_id IS NOT NULL) AS time_project_service_links;

\echo '== Canonical backfill gaps =='
SELECT count(*) AS null_billing_model_count
FROM projects
WHERE billing_model IS NULL;

\echo '== Invalid legacy/canonical mappings =='
SELECT id, name, billing_type, billing_model
FROM projects
WHERE (billing_type = 'project' AND billing_model <> 'fixed_price')
   OR (billing_type = 'hours' AND billing_model <> 'hourly')
   OR (billing_type = 'package' AND billing_model <> 'legacy_package')
   OR billing_model IS NULL
ORDER BY name, id;
