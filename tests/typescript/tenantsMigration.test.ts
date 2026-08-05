// // Deprecated: this migration-focused test is expected to disappear or be refactored in the next set of tennant based changes once the
// // legacy migration path is fully retired.
// // Leans on legacy migration approach pre-drizzle & zod integrations
// import { describe, expect, test } from "vitest";

// import { withDrizzleTestSchema } from "./bootstrap/migrationTestUtils.js";
// import { expectPgError } from "./bootstrap/tableTestUtils.js";

// const databaseUrl = process.env.DATABASE_URL?.trim();
// const describeMigration = databaseUrl ? describe : describe.skip;

// const expectedColumns = ["id", "name", "created_at", "login_slug", "is_active"];
// const expectedColumnTypes = {
//   id: "uuid",
//   name: "text",
//   created_at: "timestamp with time zone",
//   login_slug: "text",
//   is_active: "boolean",
// } as const;

// describeMigration("tenants migration", () => {
//   test("creates the table and returns an empty tenant list", { timeout: 60000 }, async () => {
//     await withDrizzleTestSchema(async (client) => {
//       const columnsResult = await client.query(
//         `
//           SELECT column_name, data_type
//           FROM information_schema.columns
//           WHERE table_schema = current_schema()
//             AND table_name = 'tenants'
//           ORDER BY ordinal_position
//         `,
//       );

//       expect(columnsResult.rows.map((row) => String(row.column_name))).toEqual(
//         expectedColumns,
//       );
//       expect(
//         Object.fromEntries(
//           columnsResult.rows.map((row) => [
//             String(row.column_name),
//             String(row.data_type),
//           ]),
//         ),
//       ).toEqual(expectedColumnTypes);

//       const rows = await client.query(
//         `
//           SELECT
//             id,
//             name,
//             login_slug,
//             is_active,
//             to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS created_at
//           FROM tenants
//           ORDER BY id
//         `,
//       );

//       expect(rows.rows).toEqual([]);

//       await expectPgError(
//         client.query(
//           `INSERT INTO tenants (id, name, login_slug) VALUES ($1, $2, $3)`,
//           [
//             "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d03",
//             "Duplicate Slug Tenant",
//             "north-shore-advisors",
//           ],
//         ),
//         { code: "23505", constraint: "tenants_login_slug_key" },
//       );

//       await expectPgError(
//         client.query(
//           `INSERT INTO tenants (id, name, login_slug) VALUES ($1, $2, $3)`,
//           [
//             "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d04",
//             "Invalid Slug Tenant",
//             "invalid_slug",
//           ],
//         ),
//         { code: "23514", constraint: "tenants_login_slug_format_check" },
//       );

//       await expectPgError(
//         client.query(
//           `INSERT INTO tenants (id, name) VALUES ($1, $2)`,
//           ["018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d05", "Missing Slug Tenant"],
//         ),
//         { code: "23502", column: "login_slug" },
//       );
//     });
//   });
// });
