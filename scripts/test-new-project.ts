import { db } from "../src/db";
import { projects, clients } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const [client] = await db.select().from(clients).where(eq(clients.name, "Mr. Okki Soebagio")).limit(1);
  if (!client) { console.error("Client not found"); process.exit(1); }
  
  const [proj] = await db.insert(projects).values({
    name: "Web App Development",
    clientId: client.id,
    status: "active",
    billingType: "by_project",
    currency: "USD",
    budget: "3500",
    startDate: "2026-07-10",
    dueDate: "2026-09-30",
    clientVisible: true,
    description: "Full-stack web application for ODM operations",
  }).returning();
  
  console.log("Project:", proj.name, "| currency:", proj.currency, "| budget:", proj.budget, "| type:", proj.billingType);
}

main().catch(console.error);
