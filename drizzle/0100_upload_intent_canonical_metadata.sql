ALTER TABLE upload_intents ADD COLUMN file_name text;
ALTER TABLE upload_intents ADD COLUMN visibility text;
ALTER TABLE upload_intents ADD COLUMN file_type text;
ALTER TABLE upload_intents ADD COLUMN client_id uuid;
ALTER TABLE upload_intents ADD COLUMN project_id uuid;
ALTER TABLE upload_intents ADD COLUMN folder_id uuid;
ALTER TABLE upload_intents ADD COLUMN uploaded_by text;
ALTER TABLE upload_intents ADD CONSTRAINT upload_intents_visibility_check CHECK (visibility IS NULL OR visibility IN ('internal','client'));
ALTER TABLE upload_intents ADD CONSTRAINT upload_intents_file_type_check CHECK (file_type IS NULL OR file_type IN ('working_file','deliverable'));
