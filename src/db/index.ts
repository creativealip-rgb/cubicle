import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: "localhost",
        port: 5432,
        database: "cubicle",
        user: "postgres",
      }
)

export const db = drizzle(pool, { schema })
export type Db = typeof db
