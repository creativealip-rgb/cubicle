import { sql } from "drizzle-orm";

export async function up(db: any) {
  await db.execute(sql`
    ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE task_comments DROP COLUMN IF EXISTS attachments;
  `);
}
