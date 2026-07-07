-- Add rate, budget, currency to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rate numeric(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget numeric(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IDR';

-- Add project_id to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- Set rate for existing by-hours project (VA ODM-12Hrs = $13/hr)
UPDATE projects SET rate = 13, currency = 'USD' WHERE billing_type = 'hours' AND name LIKE '%ODM%';

-- Set budget for existing by-project project (Website Redesign)
UPDATE projects SET budget = 25000000 WHERE billing_type = 'project' AND name LIKE '%Website%';

-- Link existing invoices to projects based on client
UPDATE invoices SET project_id = (
  SELECT p.id FROM projects p 
  WHERE p.client_id = invoices.client_id 
  ORDER BY p.created_at DESC LIMIT 1
) WHERE project_id IS NULL;
