\set ON_ERROR_STOP on

-- Ledger reconciliation only. This file intentionally contains no schema DDL.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('cubiqlo-schema-migrations'));

DO $$
DECLARE
  expected_database constant text := 'cubicle_dev';
BEGIN
  IF current_database() <> expected_database THEN
    RAISE EXCEPTION 'Refusing ledger reconciliation: expected database %, connected to %',
      expected_database,
      current_database();
  END IF;

  IF to_regclass('public.cubiqlo_migrations') IS NULL THEN
    RAISE EXCEPTION 'Missing public.cubiqlo_migrations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'portal_token_enc'
  ) THEN
    RAISE EXCEPTION '0043 schema proof failed: clients.portal_token_enc missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'portal_password_hash'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'portal_session_version'
  ) THEN
    RAISE EXCEPTION '0044 schema proof failed: portal password columns missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'portal_requests' AND column_name = 'meeting_start_time'
  ) OR to_regclass('public.appointment_calendar_syncs') IS NULL
    OR to_regclass('public.portal_requests_appointment_id_unique') IS NULL
    OR to_regclass('public.appointment_calendar_syncs_target_unique') IS NULL THEN
    RAISE EXCEPTION '0045 schema proof failed: meeting workflow objects missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cubiqlo_migrations
    WHERE id = '0043_persist_portal_token_encrypted.sql'
      AND checksum <> '95ed13dbcce0a61bd843b1a22aaaea20c3a55e9d42eb5e7dbdca67f9cb02312e'
  ) THEN
    RAISE EXCEPTION '0043 ledger checksum drift';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cubiqlo_migrations
    WHERE id = '0044_portal_password.sql'
      AND checksum <> 'c8c219393f3826682e909c7791d2ae598817e4133a6c0f6bbedba96cbcf0e652'
  ) THEN
    RAISE EXCEPTION '0044 ledger checksum drift';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cubiqlo_migrations
    WHERE id = '0045_meeting_request_workflow.sql'
      AND checksum <> 'efd2d31c41c30cd17e9913cda48fe7d634446581d1acec94f9754c103c30704a'
  ) THEN
    RAISE EXCEPTION '0045 ledger checksum drift';
  END IF;
END $$;

INSERT INTO public.cubiqlo_migrations (id, checksum, execution_ms)
VALUES
  ('0043_persist_portal_token_encrypted.sql', '95ed13dbcce0a61bd843b1a22aaaea20c3a55e9d42eb5e7dbdca67f9cb02312e', 0),
  ('0044_portal_password.sql', 'c8c219393f3826682e909c7791d2ae598817e4133a6c0f6bbedba96cbcf0e652', 0),
  ('0045_meeting_request_workflow.sql', 'efd2d31c41c30cd17e9913cda48fe7d634446581d1acec94f9754c103c30704a', 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT id, checksum, applied_at, execution_ms, operator_name
FROM public.cubiqlo_migrations
WHERE id IN (
  '0043_persist_portal_token_encrypted.sql',
  '0044_portal_password.sql',
  '0045_meeting_request_workflow.sql'
)
ORDER BY id;
