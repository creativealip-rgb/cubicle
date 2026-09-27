import { sql } from "drizzle-orm";

export async function up(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS task_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS task_comments_task_created_idx ON task_comments(task_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS task_comments_workspace_idx ON task_comments(workspace_id);
  `);
}

export async function down(db: any) {
  await db.execute(sql`DROP TABLE IF EXISTS task_comments;`);
}
