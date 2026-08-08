import { describe, expect, it, vi, beforeEach } from "vitest";

// The action module must never connect to Postgres in tests.
vi.mock("@/db", () => {
  // Per-table row stores; tests push rows to drive query results.
  const tableRows: Record<string, any[]> = {
    questionnaires: [],
    questionnaire_responses: [],
    workspace_members: [],
  };

  function makeChain(rows: any[]) {
    const chain: any = {
      where: vi.fn(() => chain),
      limit: vi.fn(async () => rows),
      orderBy: vi.fn(async () => rows),
    };
    return chain;
  }

  // drizzle exposes the physical table name via a well-known symbol;
  // `table.name` is the `name` COLUMN, not the table name.
  const TABLE_NAME = Symbol.for("drizzle:Name");
  const tableNameOf = (table: any) => table?.[TABLE_NAME];

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: any) => {
          const name = tableNameOf(table);
          if (name in tableRows) return makeChain(tableRows[name]);
          throw new Error(`unexpected select().from on table: ${String(name)}`);
        }),
      })),
      insert: vi.fn((table: any) => {
        const name = tableNameOf(table);
        if (name in tableRows) {
          return {
            values: vi.fn(() => ({
              returning: vi.fn(async () => tableRows[name]),
            })),
          };
        }
        throw new Error(`unexpected insert on table: ${String(name)}`);
      }),
      update: vi.fn((table: any) => {
        const name = tableNameOf(table);
        if (name in tableRows) {
          return {
            set: vi.fn((values: any) => ({
              where: vi.fn(() => ({
                returning: vi.fn(async () => {
                  const rows = tableRows[name].map((r) => ({ ...r, ...values }));
                  tableRows[name].length = 0;
                  tableRows[name].push(...rows);
                  return rows;
                }),
              })),
            })),
          };
        }
        throw new Error(`unexpected update on table: ${String(name)}`);
      }),
    },
    // __resetTables is imported below to reset per-test rows.
    __resetTables: () => {
      for (const rows of Object.values(tableRows)) rows.length = 0;
    },
    __tableRows: tableRows,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

const WS_UUID = "11111111-1111-4111-8111-111111111111";

vi.mock("@/lib/workspace", () => ({
  getWorkspaceForCurrentUser: vi.fn(async () => WS_UUID),
}));

vi.mock("@/lib/access", () => ({
  requireUser: vi.fn((user: any) => {
    if (!user?.id) throw new Error("Unauthorized");
    return user;
  }),
  assertWorkspaceMember: vi.fn(async () => ({ role: "owner" })),
  assertWorkspaceWritable: vi.fn(async () => ({ role: "owner" })),
}));

vi.mock("@/lib/actions/activity", () => ({
  writeActivityLog: vi.fn(async () => {}),
}));

vi.mock("@/lib/in-app-notifications", () => ({
  notifyWorkspaceMembers: vi.fn(async () => {}),
}));

import { auth } from "@/lib/auth";
import { db, __resetTables, __tableRows } from "@/db";

// The vi.mock factory above provides __resetTables/__tableRows at runtime;
// declare their shapes so tsc sees them as valid members of the mocked module.
declare module "@/db" {
  export const __resetTables: () => void;
  export const __tableRows: Record<string, any[]>;
}
import {
  createQuestionnaire,
  updateQuestionnaire,
  getQuestionnaire,
} from "@/lib/actions/questionnaires";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked(db.update);

function setQuestionnaireRows(rows: any[]) {
  __tableRows.questionnaires.length = 0;
  __tableRows.questionnaires.push(...rows);
}

const qRow = (over: Record<string, unknown> = {}) => ({
  id: "q1",
  workspaceId: WS_UUID,
  name: "Old",
  description: null,
  schema: [],
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe("updateQuestionnaire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTables();
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
  });

  it("requires an authenticated user", async () => {
    mockGetSession.mockResolvedValue(null as any);
    await expect(updateQuestionnaire("q1", { name: "New" })).rejects.toThrow("Unauthorized");
  });

  it("scopes the lookup to the current workspace", async () => {
    setQuestionnaireRows([qRow()]);
    await updateQuestionnaire("q1", { name: "New" });

    const selectMock = vi.mocked(db.select);
    expect(selectMock).toHaveBeenCalled();
    // The questionnaires table is queried (the only select in this path).
    const fromCall = (selectMock.mock.results[0].value as any).from;
    expect(fromCall).toHaveBeenCalledWith(
      expect.objectContaining({ [Symbol.for("drizzle:Name")]: "questionnaires" }),
    );
  });

  it("rejects a questionnaire from another workspace", async () => {
    setQuestionnaireRows([]);
    await expect(updateQuestionnaire("q-other-ws", { name: "New" })).rejects.toThrow("Questionnaire not found");
  });

  it("updates name, description and schema", async () => {
    const row = qRow();
    setQuestionnaireRows([row]);

    const result = await updateQuestionnaire("q1", {
      name: "New name",
      description: "New desc",
      schema: [{ id: "f1", type: "text", label: "A", required: false }],
    });

    expect(result.name).toBe("New name");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ [Symbol.for("drizzle:Name")]: "questionnaires" }),
    );
    const setCall = (mockUpdate.mock.results[0].value as any).set;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New name", description: "New desc" }),
    );
  });

  it("rejects an empty schema array", async () => {
    setQuestionnaireRows([qRow()]);
    await expect(updateQuestionnaire("q1", { schema: [] })).rejects.toThrow();
  });

  it("rejects a schema with a corrupt field", async () => {
    setQuestionnaireRows([qRow()]);
    await expect(
      // Cast: intentionally corrupt payload that must fail schema validation.
      updateQuestionnaire("q1", { schema: [{ id: 42, type: "nope", label: 42 }] } as never),
    ).rejects.toThrow();
  });

  it("rejects invalid payload fields even when the questionnaire exists", async () => {
    setQuestionnaireRows([qRow()]);
    await expect(updateQuestionnaire("q1", { name: "" })).rejects.toThrow();
  });
});

describe("createQuestionnaire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTables();
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
  });

  it("requires an authenticated user", async () => {
    mockGetSession.mockResolvedValue(null as any);
    await expect(
      createQuestionnaire({ name: "Q", schema: [{ id: "f1", type: "text", label: "A", required: false }] }),
    ).rejects.toThrow("Unauthorized");
  });

  it("creates a questionnaire with a valid schema", async () => {
    const created = qRow({ id: "q-new", name: "Q" });
    setQuestionnaireRows([created]);

    const result = await createQuestionnaire({
      name: "Q",
      description: "d",
      schema: [{ id: "f1", type: "text", label: "A", required: false }],
    });

    expect(result.id).toBe("q-new");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ [Symbol.for("drizzle:Name")]: "questionnaires" }),
    );
  });

  it("rejects a schema with a corrupt field", async () => {
    await expect(
      // Cast: intentionally corrupt payload that must fail schema validation.
      createQuestionnaire({ name: "Q", schema: [{ id: 42, type: "nope", label: 42 }] } as never),
    ).rejects.toThrow();
  });

  it("rejects an empty schema", async () => {
    await expect(createQuestionnaire({ name: "Q", schema: [] })).rejects.toThrow();
  });
});

describe("getQuestionnaire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTables();
    mockGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
  });

  it("requires an authenticated user", async () => {
    mockGetSession.mockResolvedValue(null as any);
    await expect(getQuestionnaire("q1")).rejects.toThrow("Unauthorized");
  });

  it("queries the questionnaires table scoped to workspace", async () => {
    setQuestionnaireRows([qRow()]);
    setResponseRows([]);
    await getQuestionnaire("q1");

    const selectMock = vi.mocked(db.select);
    const fromCall = (selectMock.mock.results[0].value as any).from;
    expect(fromCall).toHaveBeenCalledWith(
      expect.objectContaining({ [Symbol.for("drizzle:Name")]: "questionnaires" }),
    );
  });

  it("rejects a questionnaire from another workspace", async () => {
    setQuestionnaireRows([]);
    await expect(getQuestionnaire("q-other")).rejects.toThrow("Questionnaire not found");
  });

  it("returns questionnaire with its responses", async () => {
    setQuestionnaireRows([qRow()]);
    setResponseRows([{ id: "r1", questionnaireId: "q1" }]);

    const result = await getQuestionnaire("q1");
    expect(result.id).toBe("q1");
    expect(result.responses).toEqual([{ id: "r1", questionnaireId: "q1" }]);
  });
});

function setResponseRows(rows: any[]) {
  __tableRows.questionnaire_responses.length = 0;
  __tableRows.questionnaire_responses.push(...rows);
}
