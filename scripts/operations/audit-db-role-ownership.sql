\set ON_ERROR_STOP on

WITH unexpected AS (
  SELECT n.nspname, c.relname, c.relkind, pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
    AND pg_get_userbyid(c.relowner) <> 'cubiqlo_owner'
)
SELECT count(*) AS unexpected_owner_count FROM unexpected;

SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname IN ('cubiqlo_owner', 'cubiqlo_migrator', 'cubiqlo_app', 'cubiqlo_backup')
ORDER BY rolname;

SELECT
  has_database_privilege('cubiqlo_app', current_database(), 'CREATE') AS app_can_create_database_objects,
  has_schema_privilege('cubiqlo_app', 'public', 'CREATE') AS app_can_create_schema_objects,
  has_schema_privilege('cubiqlo_backup', 'public', 'CREATE') AS backup_can_create_schema_objects;
