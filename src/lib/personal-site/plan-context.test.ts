import { describe, expect, it, vi } from "vitest";

const queryRows = [
  {
    id: "site-1",
    workspaceId: "workspace-1",
    userId: "owner-1",
    slug: "custom-slug",
    published: true,
    plan: "solo",
    planExpiresAt: null,
    workspaceSlug: "owner-slug",
    ownerId: "owner-1",
  },
];

vi.mock("@/db/schema", () => ({
  personalSites: { id: "site.id", workspaceId: "site.workspaceId", userId: "site.userId", slug: "site.slug", published: "site.published" },
  users: { id: "user.id", plan: "user.plan", planExpiresAt: "user.planExpiresAt" },
  workspaces: { id: "workspace.id", ownerId: "workspace.ownerId", slug: "workspace.slug" },
}));
vi.mock("@/db", () => {
  let selectCount = 0;
  return {
    db: {
      select: vi.fn(() => {
        selectCount++;
        const query = selectCount === 1
          ? { limit: vi.fn(async () => [queryRows[0]]) }
          : Promise.resolve(queryRows);
        return {
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              innerJoin: vi.fn(() => ({ where: vi.fn(() => query) })),
              where: vi.fn(() => query),
            })),
          })),
        };
      }),
    },
  };
});
vi.mock("drizzle-orm", () => ({ eq: vi.fn((left, right) => [left, right]) }));

import { getPersonalSiteOwnerPlanContext, listPersonalSiteRows } from "./plan-context";

describe("personal site plan context queries", () => {
  it("returns owner plan and workspace slug", async () => {
    await expect(getPersonalSiteOwnerPlanContext("workspace-1")).resolves.toEqual(queryRows[0]);
  });

  it("lists site rows with owner and workspace context", async () => {
    await expect(listPersonalSiteRows()).resolves.toEqual(queryRows);
  });
});

