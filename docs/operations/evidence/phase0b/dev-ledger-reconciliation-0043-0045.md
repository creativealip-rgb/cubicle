# Cubiqlo Phase 0B dev ledger reconciliation evidence

Generated UTC: 2026-07-27T17:18:04Z

## Target identity before write

```text
cubicle_dev	postgres
```

## Backup artifact

```text
28af83aa166e30b10c98a48fca3d1d49874e4a9d4b48fac1f4a1986d7ff75897  /root/backups/databases/cubiqlo-dev-phase0b/cubicle_dev-pre-ledger-20260727T171648Z.dump
exact row-count map hash source/restore: 5f96fe7323fa7bfb800f8370596a54ae82e4fff88b9e14b89c0cf6dfc1e01c69
restore-test: PASS
```

## Schema proof before ledger insert

```text
appointment_calendar_syncs	appointment_id
appointment_calendar_syncs	created_at
appointment_calendar_syncs	external_calendar_id
appointment_calendar_syncs	external_event_id
appointment_calendar_syncs	id
appointment_calendar_syncs	last_error
appointment_calendar_syncs	provider
appointment_calendar_syncs	status
appointment_calendar_syncs	target_id
appointment_calendar_syncs	target_type
appointment_calendar_syncs	updated_at
clients	portal_password_hash
clients	portal_session_version
clients	portal_token_enc
portal_requests	appointment_id
portal_requests	meeting_duration_minutes
portal_requests	meeting_proposed_by_user_id
portal_requests	meeting_response_note
portal_requests	meeting_start_time
portal_requests	meeting_status
portal_requests	meeting_timezone
```

## Reconciliation execution

```text
BEGIN
 pg_advisory_xact_lock
-----------------------

(1 row)

DO
INSERT 0 3
COMMIT
                   id                    |                             checksum                             |          applied_at           | execution_ms | operator_name
-----------------------------------------+------------------------------------------------------------------+-------------------------------+--------------+---------------
 0043_persist_portal_token_encrypted.sql | 95ed13dbcce0a61bd843b1a22aaaea20c3a55e9d42eb5e7dbdca67f9cb02312e | 2026-07-27 17:18:04.955926+00 |            0 | postgres
 0044_portal_password.sql                | c8c219393f3826682e909c7791d2ae598817e4133a6c0f6bbedba96cbcf0e652 | 2026-07-27 17:18:04.955926+00 |            0 | postgres
 0045_meeting_request_workflow.sql       | efd2d31c41c30cd17e9913cda48fe7d634446581d1acec94f9754c103c30704a | 2026-07-27 17:18:04.955926+00 |            0 | postgres
(3 rows)

```

## Full authoritative ledger after write

```text
0040_cleanup_duplicate_foreign_keys.sql	92b93f422592f73204a9e5c519d40aecca9014bc5b91d0a6de9e2a733e0cd6c4	postgres
0041_disable_portal_slug_auth.sql	91541b3c65ea3219f694daa77e8f477357fcc077e464e196b6ff8f9ea8e6b215	cubiqlo_migrator
0042_add_fk_indexes.sql	fde3d495e0dbeec93e7535b120c58e00499dd0afda393bc257b2dabdcace783a	cubiqlo_migrator
0043_persist_portal_token_encrypted.sql	95ed13dbcce0a61bd843b1a22aaaea20c3a55e9d42eb5e7dbdca67f9cb02312e	postgres
0044_portal_password.sql	c8c219393f3826682e909c7791d2ae598817e4133a6c0f6bbedba96cbcf0e652	postgres
0045_meeting_request_workflow.sql	efd2d31c41c30cd17e9913cda48fe7d634446581d1acec94f9754c103c30704a	postgres
0046_phase0a_integrity_containment.sql	92c4682185d2b3c38c71fdc2407fb3a3918f1400b15492c11fce6a7f2e439ddb	postgres
baseline-2026-07-25	1a4fb3403575a0f69429243bcc16bce1ada4be2ab62eda8b5232223a482350a2	postgres
```

## Controlled no-op rerun

```text
BEGIN
 pg_advisory_xact_lock
-----------------------

(1 row)

DO
INSERT 0 0
COMMIT
                   id                    |                             checksum                             |          applied_at           | execution_ms | operator_name
-----------------------------------------+------------------------------------------------------------------+-------------------------------+--------------+---------------
 0043_persist_portal_token_encrypted.sql | 95ed13dbcce0a61bd843b1a22aaaea20c3a55e9d42eb5e7dbdca67f9cb02312e | 2026-07-27 17:18:04.955926+00 |            0 | postgres
 0044_portal_password.sql                | c8c219393f3826682e909c7791d2ae598817e4133a6c0f6bbedba96cbcf0e652 | 2026-07-27 17:18:04.955926+00 |            0 | postgres
 0045_meeting_request_workflow.sql       | efd2d31c41c30cd17e9913cda48fe7d634446581d1acec94f9754c103c30704a | 2026-07-27 17:18:04.955926+00 |            0 | postgres
(3 rows)

```

## Ledger runner controlled no-op

```text
baseline-2026-07-25 ... already applied
0040_cleanup_duplicate_foreign_keys.sql ... already applied
0041_disable_portal_slug_auth.sql ... already applied
0042_add_fk_indexes.sql ... already applied
0043_persist_portal_token_encrypted.sql ... already applied
0044_portal_password.sql ... already applied
0045_meeting_request_workflow.sql ... already applied
0046_phase0a_integrity_containment.sql ... already applied
```
