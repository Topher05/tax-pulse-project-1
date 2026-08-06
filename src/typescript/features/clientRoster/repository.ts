import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import { clientRoster as clientRosterTable } from "../../shared/database/schema.js";
import {
  clientRosterRowSchema,
  type ClientRosterRow,
} from "./clientRoster.js";

export interface ClientRosterListInput {
  tenantId: string;
}

export interface ClientRosterRepository {
  listByTenant(input: ClientRosterListInput): Promise<ClientRosterRow[]>;
}

function toClientRosterRow(row: {
  id: string;
  clientName: string;
  filingStatus: string;
  ytdIncome: string;
  estimatedTax: string;
  quarterlyStatus: string | null;
}): ClientRosterRow {
  return clientRosterRowSchema.parse({
    id: row.id,
    clientName: row.clientName,
    filingStatus: row.filingStatus,
    ytdIncome: Number(row.ytdIncome),
    estimatedTax: Number(row.estimatedTax),
    quarterlyStatus: row.quarterlyStatus,
  });
}

export function createClientRosterRepository(
  client: Client,
): ClientRosterRepository {
  const db = drizzle(client);

  return {
    async listByTenant({ tenantId }) {
      const rows = await db
        .select({
          id: clientRosterTable.id,
          clientName: clientRosterTable.clientName,
          filingStatus: clientRosterTable.filingStatus,
          ytdIncome: clientRosterTable.ytdIncome,
          estimatedTax: clientRosterTable.estimatedTax,
          quarterlyStatus: clientRosterTable.quarterlyStatus,
        })
        .from(clientRosterTable)
        .where(eq(clientRosterTable.tenantId, tenantId))
        .orderBy(asc(clientRosterTable.clientName));

      return rows.map(toClientRosterRow);
    },
  };
}
