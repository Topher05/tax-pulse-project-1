import { describe, expect, test } from "vitest";

import {
  createClientRosterRepository,
} from "../../../src/typescript/index.js";
import { tenantRows } from "../../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { getTableStructure } from "../bootstrap/tableTestUtils.js";

const expectedClientRosterColumns = [
  "id",
  "tenant_id",
  "client_name",
  "filing_status",
  "ytd_income",
  "estimated_tax",
  "quarterly_status",
] as const;

describe("Client Roster repository", () => {
  test("creates the tenant-scoped client roster table contract", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const structure = await getTableStructure(client, "client_roster");

      expect(structure.columns).toEqual(expectedClientRosterColumns);
      expect(structure.columnTypes).toMatchObject({
        id: "uuid",
        tenant_id: "uuid",
        client_name: "text",
        filing_status: "text",
        ytd_income: "numeric",
        estimated_tax: "numeric",
        quarterly_status: "text",
      });
      expect(structure.constraints.client_roster_pkey?.type).toBe("p");
      expect(structure.constraints.client_roster_tenant_id_fk?.type).toBe("f");
      expect(structure.indexes).toContain("client_roster_tenant_id_client_name_idx");
      expect(structure.rowCount).toBe(6);
    });
  });

  test("lists only the requested tenant's roster rows by client name", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createClientRosterRepository(client);

      const rows = await repository.listByTenant({ tenantId: tenantRows[0].id });

      expect(rows).toEqual([
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
          clientName: "Avery Chen",
          filingStatus: "Single - 1099",
          ytdIncome: 108_500,
          estimatedTax: 32_100,
          quarterlyStatus: "Q2 due Jun 15",
        },
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82",
          clientName: "Morgan Acme",
          filingStatus: "MFJ - W-2 + RSU",
          ytdIncome: 414_000,
          estimatedTax: 138_400,
          quarterlyStatus: "Q2 due Jun 15",
        },
      ]);
      expect(rows.map((row) => row.clientName)).not.toContain("Riley Khan");

      await expect(
        repository.listByTenant({ tenantId: tenantRows[1].id }),
      ).resolves.toEqual([
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
          clientName: "Riley Khan",
          filingStatus: "HoH - W-2",
          ytdIncome: 72_500,
          estimatedTax: 11_140,
          quarterlyStatus: null,
        },
      ]);
    });
  });
});
