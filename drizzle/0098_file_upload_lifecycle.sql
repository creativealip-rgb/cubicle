ALTER TABLE files ADD COLUMN upload_state text NOT NULL DEFAULT 'completed';
ALTER TABLE files ADD CONSTRAINT files_upload_state_check CHECK (upload_state IN ('pending','completed'));
CREATE INDEX files_workspace_upload_state_idx ON files(workspace_id, upload_state);
