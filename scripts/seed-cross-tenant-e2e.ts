import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clients, projects, tasks, users, workspaces, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

const url = process.env.DATABASE_URL ?? "";
if (!/\/cubicle_e2e(?:\?|$)/.test(url)) throw new Error("Refusing to seed non-E2E database");
const password = process.env.E2E_PASSWORD;
if (!password || password.length < 12) throw new Error("E2E_PASSWORD must be at least 12 characters");

const people = [
  ["owner-a@cubiqlo.test", "Owner A"],
  ["member-a@cubiqlo.test", "Member A"],
  ["viewer-a@cubiqlo.test", "Viewer A"],
  ["owner-b@cubiqlo.test", "Owner B"],
  ["outsider@cubiqlo.test", "Outsider"],
] as const;

async function main() {
  const ids: Record<string, string> = {};
  for (const [email, name] of people) {
    const result = await auth.api.signUpEmail({ body: { email, name, password } });
    if (!result.user?.id) throw new Error(`Signup failed: ${email}`);
    ids[email] = result.user.id;
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, result.user.id));
  }

  const [wsA] = await db.insert(workspaces).values({ name: "E2E Workspace A", slug: "e2e-workspace-a", ownerId: ids["owner-a@cubiqlo.test"] }).returning();
  const [wsB] = await db.insert(workspaces).values({ name: "E2E Workspace B", slug: "e2e-workspace-b", ownerId: ids["owner-b@cubiqlo.test"] }).returning();
  await db.insert(workspaceMembers).values([
    { workspaceId: wsA.id, userId: ids["owner-a@cubiqlo.test"], role: "owner" },
    { workspaceId: wsA.id, userId: ids["member-a@cubiqlo.test"], role: "member" },
    { workspaceId: wsA.id, userId: ids["viewer-a@cubiqlo.test"], role: "viewer" },
    { workspaceId: wsB.id, userId: ids["owner-b@cubiqlo.test"], role: "owner" },
  ]);
  const [clientA] = await db.insert(clients).values({ workspaceId: wsA.id, name: "E2E Client A", email: "client-a@cubiqlo.test", createdBy: ids["owner-a@cubiqlo.test"] }).returning();
  const [clientB] = await db.insert(clients).values({ workspaceId: wsB.id, name: "E2E Client B", email: "client-b@cubiqlo.test", createdBy: ids["owner-b@cubiqlo.test"] }).returning();
  const [projectA] = await db.insert(projects).values({ workspaceId: wsA.id, clientId: clientA.id, name: "E2E Project A", createdBy: ids["owner-a@cubiqlo.test"] }).returning();
  const [projectB] = await db.insert(projects).values({ workspaceId: wsB.id, clientId: clientB.id, name: "E2E Project B", createdBy: ids["owner-b@cubiqlo.test"] }).returning();
  const [taskB] = await db.insert(tasks).values({ workspaceId: wsB.id, projectId: projectB.id, title: "E2E Task B", createdBy: ids["owner-b@cubiqlo.test"] }).returning();

  console.log(JSON.stringify({ wsA: wsA.id, wsB: wsB.id, clientA: clientA.id, clientB: clientB.id, projectA: projectA.id, projectB: projectB.id, taskB: taskB.id, users: ids }));
}
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
