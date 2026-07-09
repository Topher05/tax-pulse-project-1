import type { Client } from "pg";

import { quoteIdentifier } from "./migrationTestUtils.js";

export async function getTableStructure(
  client: Client,
  tableName: string,
): Promise<{
  columns: string[];
  columnTypes: Record<string, string>;
  constraints: Record<string, { definition: string; type: string }>;
  indexes: string[];
  rowCount: number;
}> {
  const rowCountResult = await client.query(
    `SELECT count(*)::int AS row_count FROM ${quoteIdentifier(tableName)}`,
  );
  const columnsResult = await client.query(
    `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );
  const constraintsResult = await client.query(
    `
      SELECT conname, contype, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = $1::regclass
    `,
    [tableName],
  );
  const indexesResult = await client.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename = $1
      ORDER BY indexname
    `,
    [tableName],
  );

  return {
    rowCount: Number(rowCountResult.rows[0]?.row_count ?? 0),
    columns: columnsResult.rows.map((row) => String(row.column_name)),
    columnTypes: Object.fromEntries(
      columnsResult.rows.map((row) => [
        String(row.column_name),
        String(row.data_type),
      ]),
    ),
    constraints: Object.fromEntries(
      constraintsResult.rows.map((row) => [
        String(row.conname),
        {
          definition: String(row.definition),
          type: String(row.contype),
        },
      ]),
    ),
    indexes: indexesResult.rows.map((row) => String(row.indexname)),
  };
}

type PgErrorLike = {
  code?: string;
  constraint?: string;
  table?: string;
  column?: string;
  message?: string;
};

export async function expectPgError(
  action: Promise<unknown>,
  expected: {
    code: string;
    constraint?: string;
    table?: string;
    column?: string;
    messageIncludes?: string;
  },
): Promise<void> {
  try {
    await action;
  } catch (error) {
    const pgError = error as PgErrorLike;

    if (pgError.code !== expected.code) {
      throw new Error(
        `Expected query to fail with ${expected.code}, received ${pgError.code ?? "unknown"}`,
      );
    }

    if (expected.constraint) {
      if (pgError.constraint !== expected.constraint) {
        throw new Error(
          `Expected constraint ${expected.constraint}, received ${pgError.constraint ?? "unknown"}`,
        );
      }
    }
    if (expected.table) {
      if (pgError.table !== expected.table) {
        throw new Error(
          `Expected table ${expected.table}, received ${pgError.table ?? "unknown"}`,
        );
      }
    }
    if (expected.column) {
      if (pgError.column !== expected.column) {
        throw new Error(
          `Expected column ${expected.column}, received ${pgError.column ?? "unknown"}`,
        );
      }
    }
    if (expected.messageIncludes) {
      if (!(pgError.message ?? "").includes(expected.messageIncludes)) {
        throw new Error(
          `Expected error message to include "${expected.messageIncludes}", received "${pgError.message ?? ""}"`,
        );
      }
    }
    return;
  }

  throw new Error(`Expected query to fail with ${expected.code}`);
}
