ALTER TABLE projects ALTER COLUMN client_id DROP NOT NULL;

INSERT INTO cubiqlo_migrations (id, checksum, operator_name)
VALUES ('0093_project_client_optional.sql', 'project-client-optional-v1', current_user)
ON CONFLICT (id) DO NOTHING;
