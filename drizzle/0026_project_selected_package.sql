ALTER TABLE projects ADD COLUMN selected_package_id uuid REFERENCES packages(id) ON DELETE SET NULL;
