-- Add plan column to workspaces for tier enforcement
-- free: 3 clients max, basic features
-- solo: unlimited clients, full features  
-- team: 5 users, shared workspace

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
