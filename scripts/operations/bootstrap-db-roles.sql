\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cubiqlo_owner') THEN
    CREATE ROLE cubiqlo_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cubiqlo_migrator') THEN
    CREATE ROLE cubiqlo_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cubiqlo_app') THEN
    CREATE ROLE cubiqlo_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cubiqlo_backup') THEN
    CREATE ROLE cubiqlo_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE cubiqlo_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE cubiqlo_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE cubiqlo_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE cubiqlo_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT cubiqlo_owner TO cubiqlo_migrator;

DO $$
DECLARE item record;
BEGIN
  EXECUTE format('ALTER DATABASE %I OWNER TO cubiqlo_owner', current_database());
  ALTER SCHEMA public OWNER TO cubiqlo_owner;
  FOR item IN
    SELECT n.nspname, c.relname, c.relkind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p','S','v','m')
  LOOP
    EXECUTE format(
      'ALTER %s %I.%I OWNER TO cubiqlo_owner',
      CASE item.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,
      item.nspname,
      item.relname
    );
  END LOOP;
  FOR item IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) OWNER TO cubiqlo_owner', item.nspname, item.proname, item.args);
  END LOOP;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO cubiqlo_migrator, cubiqlo_app, cubiqlo_backup', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO cubiqlo_migrator, cubiqlo_app, cubiqlo_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cubiqlo_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO cubiqlo_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cubiqlo_backup;
REVOKE CREATE ON SCHEMA public FROM cubiqlo_app, cubiqlo_backup;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

SET ROLE cubiqlo_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cubiqlo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO cubiqlo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cubiqlo_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
RESET ROLE;

-- Passwords are injected separately through protected runtime secret handling.
