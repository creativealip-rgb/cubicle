\set ON_ERROR_STOP on

-- Required psql variables: target_db, owner_role, migrator_role, app_role, backup_role
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE :"target_db" TO :"owner_role", :"migrator_role", :"app_role", :"backup_role";
GRANT USAGE ON SCHEMA public TO :"app_role", :"backup_role";

-- Move application-owned schema objects away from the bootstrap superuser.
ALTER SCHEMA public OWNER TO :"owner_role";

SELECT set_config('cubiqlo.owner_role', :'owner_role', false);

DO $$
DECLARE obj record;
BEGIN
  FOR obj IN
    SELECT format('%I.%I', schemaname, tablename) AS qualified_name
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s OWNER TO %I', obj.qualified_name, current_setting('cubiqlo.owner_role'));
  END LOOP;

  FOR obj IN
    SELECT format('%I.%I', sequence_schema, sequence_name) AS qualified_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE %s OWNER TO %I', obj.qualified_name, current_setting('cubiqlo.owner_role'));
  END LOOP;

  FOR obj IN
    SELECT p.oid::regprocedure::text AS qualified_name
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'assign_client_number'
  LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO %I', obj.qualified_name, current_setting('cubiqlo.owner_role'));
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_role";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"app_role";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO :"app_role";

GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"backup_role";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO :"backup_role";

ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
  GRANT SELECT ON TABLES TO :"backup_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO :"backup_role";

REVOKE CREATE ON SCHEMA public FROM :"app_role", :"backup_role";
REVOKE TEMPORARY ON DATABASE :"target_db" FROM :"app_role", :"backup_role";

ALTER ROLE :"backup_role" SET default_transaction_read_only = on;
