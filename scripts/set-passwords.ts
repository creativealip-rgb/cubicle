// Add passwords to seeded users via better-auth signUp + user_id swap
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

const creds = [
  { seedEmail: "owner@cubicle.test", password: "password123" },
  { seedEmail: "member@cubicle.test", password: "password123" },
  { seedEmail: "viewer@cubicle.test", password: "password123" },
];

async function main() {
  for (const c of creds) {
    const [seeded] = await db.select().from(users).where(eq(users.email, c.seedEmail)).limit(1);
    if (!seeded) {
      console.log(`Skip ${c.seedEmail} (not found)`);
      continue;
    }
    const [existing] = await db.select().from(accounts).where(eq(accounts.userId, seeded.id)).limit(1);
    if (existing) {
      console.log(`Skip ${c.seedEmail} (account exists)`);
      continue;
    }
    const tempEmail = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cubicle.test`;
    let result;
    try {
      result = await auth.api.signUpEmail({
        body: { email: tempEmail, password: c.password, name: seeded.name },
      });
    } catch (e: unknown) {
      console.log(`SignUp failed for ${c.seedEmail}:`, e instanceof Error ? e.message : e);
      continue;
    }
    const newUserId = result?.user?.id;
    if (!newUserId) {
      console.log(`No user.id returned for ${c.seedEmail}`);
      continue;
    }
    await db.update(accounts).set({ userId: seeded.id, accountId: seeded.id }).where(eq(accounts.userId, newUserId));
    await db.delete(users).where(eq(users.id, newUserId));
    console.log(`OK ${c.seedEmail} -> password set, account bound to ${seeded.id}`);
  }
  console.log("\nDone");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
