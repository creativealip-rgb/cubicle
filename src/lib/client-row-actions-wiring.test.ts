import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const table = readFileSync("src/components/clients/clients-list-table.tsx", "utf8");
const actions = readFileSync("src/components/clients/client-row-actions.tsx", "utf8");

describe("client row actions", () => {
  it("uses one ellipsis menu for desktop and mobile with edit and archive", () => {
    expect(table.match(/<ClientRowActions client=\{client\}/g)).toHaveLength(2);
    expect(actions).toContain("<Ellipsis");
    expect(actions).toContain('t("Ubah", "Edit")');
    expect(actions).toContain('t("Arsipkan", "Archive")');
    expect(actions).toContain('t("Pulihkan", "Restore")');
    expect(actions).toContain('updateClientStatus(client.id, archived ? "active" : "archived")');
    expect(actions).toContain("Projects, invoices, files, and portal data will not be deleted.");
  });
});
